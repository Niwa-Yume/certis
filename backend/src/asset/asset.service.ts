import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Asset, Event } from '@prisma/client';
import { randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { decodeJws, sha256, signJws } from '../crypto/crypto.service';
import { IssuerService } from '../issuer/issuer.service';
import { NonceService } from '../nonce/nonce.service';
import { PassportPayload, RegistryService } from '../registry/registry.service';
import { CreateAssetDto } from './dto/create-asset.dto';

// Le contrôle du numéro de série suit une vérification réussie, et reste borné (ADR-0005).
const SERIAL_CHECKS = 5;
const SERIAL_WINDOW_MS = 10 * 60_000;

/** Pour le seed : une date d'inscription passée et une photo détourée, hors de l'API. */
type MintOptions = { at?: Date; imageCutout?: boolean; imageUrl?: string };

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nonce: NonceService,
    private readonly issuers: IssuerService,
    private readonly registry: RegistryService,
  ) {}

  /**
   * Inscription par l'émetteur (ADR-0003) : il signe le passeport avec sa clé, et le premier maillon
   * de la chaîne est écrit dans la même transaction. Le numéro de série n'est jamais stocké.
   */
  async mint(
    dto: CreateAssetDto,
    issuerUserId: string,
    issuerId: string,
    {
      at = new Date(),
      imageCutout = dto.imageCutout ?? false,
      imageUrl = dto.imageUrl,
    }: MintOptions = {},
  ) {
    let ownerId = issuerUserId;
    if (dto.ownerEmail) {
      const owner = await this.prisma.user.findUnique({
        where: { email: dto.ownerEmail },
      });
      if (!owner) throw new NotFoundException('Destinataire introuvable');
      ownerId = owner.id;
    }

    const issuer = await this.prisma.issuer.findUniqueOrThrow({
      where: { id: issuerId },
    });
    const id = randomUUID();
    const serialHash = this.issuers.serialHash(issuerId, dto.serial);
    const payload: PassportPayload = {
      v: 2,
      type: 'CertisPassport',
      issuer: { id: issuer.id, name: issuer.name },
      validFrom: at.toISOString(),
      credentialSubject: {
        id,
        brand: dto.brand,
        model: dto.model,
        name: dto.name,
        reference: dto.reference,
        specs: {
          movement: dto.movement ?? null,
          case: dto.case ?? null,
          dial: dto.dial ?? null,
          bracelet: dto.bracelet ?? null,
        },
        serialHash,
        image: imageUrl ?? null,
      },
    };
    const { kid, key } = await this.issuers.signingKey(issuerId);
    const passport = signJws(payload, key, kid, 'certis-passport+jws');

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          id,
          name: dto.name,
          brand: dto.brand,
          model: dto.model,
          reference: dto.reference,
          caliber: dto.movement,
          caseDescription: dto.case,
          dial: dto.dial,
          bracelet: dto.bracelet,
          status: 'ACTIVE',
          ownerId,
          issuerId,
          passport,
          serialHash,
          imageUrl,
          imageCutout,
        },
      });
      await this.registry.append(
        tx,
        asset,
        'MINT',
        {
          issuer: issuerId,
          passport: sha256(passport),
          owner: this.registry.actorRef(id, ownerId),
        },
        at,
      );
      return this.summary(asset);
    });
  }

  async findAll(ownerId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
    return assets.map((asset) => this.summary(asset));
  }

  /** Vue du propriétaire : la pièce, son émetteur et sa provenance, où il se reconnaît. */
  async findOne(id: string, userId: string) {
    const asset = await this.owned(id, userId);
    const [issuer, events] = await Promise.all([
      this.prisma.issuer.findUniqueOrThrow({ where: { id: asset.issuerId } }),
      this.prisma.event.findMany({
        where: { assetId: id },
        orderBy: { seq: 'asc' },
      }),
    ]);
    const me = this.registry.actorRef(id, userId);
    return {
      ...this.summary(asset),
      issuer: { id: issuer.id, name: issuer.name },
      provenance: events.map((e) => ({
        ...this.provenance(e),
        you: (e.data as Record<string, string>).to === me,
      })),
    };
  }

  /** Passeport et chaîne complète : l'entrée du vérificateur indépendant (tools/verify). */
  async history(id: string, userId: string) {
    return this.registry.export(await this.owned(id, userId));
  }

  async verify(id: string, userId: string) {
    const { problem } = await this.registry.verify(
      await this.owned(id, userId),
    );
    return problem ? { valid: false, problem } : { valid: true };
  }

  issueVerification(id: string, ownerId: string) {
    return this.nonce.issue(id, ownerId, 'VERIFY');
  }

  /** Déclaration de vol ou de restitution, par le propriétaire en titre uniquement (ADR-0006). */
  async report(
    id: string,
    userId: string,
    type: 'STOLEN_REPORTED' | 'RECOVERED',
  ) {
    const stolen = type === 'STOLEN_REPORTED';
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findFirst({
        where: { id, ownerId: userId },
      });
      if (!asset) throw new NotFoundException(`Asset ${id} introuvable`);
      if ((asset.status === 'STOLEN') === stolen) {
        throw new ConflictException(
          stolen
            ? 'Cette montre est déjà déclarée volée'
            : "Cette montre n'est pas déclarée volée",
        );
      }
      await this.registry.append(tx, asset, type, {
        by: this.registry.actorRef(id, userId),
      });
      const updated = await tx.asset.update({
        where: { id },
        data: { status: stolen ? 'STOLEN' : 'ACTIVE' },
      });
      return { status: updated.status };
    });
  }

  /** Révision enregistrée et signée par l'émetteur de la pièce, et par lui seul. */
  async recordService(id: string, issuerId: string, note: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} introuvable`);
    if (asset.issuerId !== issuerId) {
      throw new ForbiddenException(
        "Seul l'émetteur de cette pièce peut y enregistrer une révision",
      );
    }
    await this.prisma.$transaction((tx) =>
      this.registry.append(tx, asset, 'SERVICE', { issuer: issuerId, note }),
    );
    return { recorded: true };
  }

  /**
   * Vérification publique : consomme le QR, puis recalcule passeport, chaîne et cohérence.
   * Ce que voit l'acheteur vient du passeport signé, jamais des colonnes de la base.
   * Aucune identité : la chaîne ne porte que des pseudonymes (ADR-0006).
   */
  async authenticate(id: string, nonceValue: string) {
    await this.nonce.consume(nonceValue, id, 'VERIFY');
    const asset = await this.prisma.asset.findUniqueOrThrow({ where: { id } });
    const verifiedAt = new Date().toISOString();
    const result = await this.registry.verify(asset);
    if (result.problem) {
      return { valid: false, problem: result.problem, verifiedAt };
    }
    return {
      valid: true,
      verifiedAt,
      status: result.stolen ? 'STOLEN' : 'ACTIVE',
      passport: result.payload,
      // Indication d'affichage (photo détourée), hors du passeport signé.
      imageCutout: asset.imageCutout,
      provenance: result.events.map((e) => ({
        type: e.type,
        at: e.at,
        ...(e.type === 'SERVICE' ? { note: e.data.note } : {}),
      })),
      proof: {
        passport: asset.passport,
        events: result.events,
        keys: '/.well-known/certis-keys',
      },
    };
  }

  /**
   * L'acheteur compare le numéro gravé sur la pièce à l'empreinte du passeport.
   * Seulement après une vérification réussie avec ce QR, 5 fois au plus en 10 minutes :
   * deviner un numéro exige la coopération répétée du propriétaire (ADR-0005).
   */
  async checkSerial(id: string, nonceValue: string, serial: string) {
    const nonce = await this.prisma.authNonce.findUnique({
      where: { nonceValue },
    });
    const fresh =
      nonce?.usedAt && Date.now() - nonce.usedAt.getTime() < SERIAL_WINDOW_MS;
    if (
      !nonce ||
      nonce.assetId !== id ||
      nonce.purpose !== 'VERIFY' ||
      !fresh
    ) {
      throw new ForbiddenException(
        'Vérifiez la pièce avant de contrôler son numéro de série',
      );
    }
    const { count } = await this.prisma.authNonce.updateMany({
      where: { id: nonce.id, serialChecks: { lt: SERIAL_CHECKS } },
      data: { serialChecks: { increment: 1 } },
    });
    if (count !== 1) {
      throw new HttpException(
        'Nombre de contrôles atteint pour ce QR : demandez-en un nouveau au vendeur.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const asset = await this.prisma.asset.findUniqueOrThrow({ where: { id } });
    const expected = Buffer.from(
      decodeJws<PassportPayload>(asset.passport)?.payload.credentialSubject
        .serialHash ?? '',
    );
    const actual = Buffer.from(this.issuers.serialHash(asset.issuerId, serial));
    return {
      match:
        expected.length === actual.length && timingSafeEqual(expected, actual),
    };
  }

  /** Réservé au propriétaire : 404 plutôt que 403, pour ne pas confirmer l'existence d'une montre d'autrui (AUDIT S8). */
  private async owned(id: string, ownerId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, ownerId } });
    if (!asset) throw new NotFoundException(`Asset ${id} introuvable`);
    return asset;
  }

  private summary(asset: Asset) {
    return {
      id: asset.id,
      name: asset.name,
      brand: asset.brand,
      model: asset.model,
      reference: asset.reference,
      status: asset.status,
      imageUrl: asset.imageUrl,
      imageCutout: asset.imageCutout,
      createdAt: asset.createdAt,
      specs: {
        movement: asset.caliber,
        case: asset.caseDescription,
        dial: asset.dial,
        bracelet: asset.bracelet,
      },
    };
  }

  private provenance(e: Event) {
    const data = e.data as Record<string, string>;
    return {
      seq: e.seq,
      type: e.type,
      at: e.at,
      ...(e.type === 'SERVICE' ? { note: data.note } : {}),
    };
  }
}
