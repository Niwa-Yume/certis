import {
  ConflictException,
  ForbiddenException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Asset, Event, Issuer } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { decodeJws, sha256, signJws } from '../crypto/crypto.service';
import { IssuerService } from '../issuer/issuer.service';
import { NonceService } from '../nonce/nonce.service';
import { PassportPayload, RegistryService } from '../registry/registry.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { pieceNotFound } from '../common/errors';
import { CATALOG, DEMO_HOUSE, DEMO_LINKS } from '../catalog/catalog';
import { TRIAL_ACCOUNT, TRIAL_ISSUER, TRIAL_PIECE } from './trial';

// Le contrôle du numéro de série suit une vérification réussie, et reste borné (ADR-0005).
const SERIAL_CHECKS = 5;
const SERIAL_WINDOW_MS = 10 * 60_000;

/** Pour le seed : une date d'inscription passée et une photo détourée, hors de l'API. */
const INVITATION_DAYS = 7;

const invitationNotFound = () =>
  new NotFoundException(
    'Cette invitation est introuvable : vérifiez le lien, ou demandez-en une nouvelle à la maison.',
  );
const invitationExpired = () =>
  new GoneException(
    'Cette invitation a expiré : elle ne vaut que sept jours. Demandez-en une nouvelle à la maison.',
  );

/** « claire.vasseur@exemple.ch » → « c•••@exemple.ch » : le client se reconnaît, un tiers non. */
export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  return `${name[0]}•••@${domain}`;
};

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
      if (!owner) {
        throw new NotFoundException(
          'Aucun compte Certis n’utilise l’e-mail du premier propriétaire : vérifiez-le, ou laissez-le vide pour garder la pièce en stock.',
        );
      }
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
          issuedById: issuerUserId,
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
      return this.summary({ ...asset, issuer });
    });
  }

  /** Création en cours du compte d'essai : des inscriptions simultanées l'attendent au lieu de la refaire. */
  private creatingTrialAccount?: Promise<{ id: string; issuerId: string }>;

  /** Le compte système et l'émetteur des pièces d'essai, créés au premier besoin (ADR-0012). */
  private async trialAccount() {
    const found = await this.prisma.user.findUnique({
      where: { email: TRIAL_ACCOUNT },
    });
    if (found?.issuerId) return { id: found.id, issuerId: found.issuerId };
    this.creatingTrialAccount ??= this.createTrialAccount().finally(() => {
      this.creatingTrialAccount = undefined;
    });
    return this.creatingTrialAccount;
  }

  private async createTrialAccount() {
    const issuer = await this.issuers.create(TRIAL_ISSUER, true);
    const user = await this.prisma.user.create({
      data: {
        email: TRIAL_ACCOUNT,
        // Un mot de passe que personne ne connaît : on ne se connecte pas à ce compte.
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
        role: 'ISSUER',
        issuerId: issuer.id,
      },
    });
    return { id: user.id, issuerId: issuer.id };
  }

  /** La pièce d'essai d'un nouveau compte : pour tout essayer sans attendre qu'une maison inscrive une montre. */
  async giveTrialPiece(email: string) {
    const account = await this.trialAccount();
    return this.mint(
      { ...TRIAL_PIECE, ownerEmail: email },
      account.id,
      account.issuerId,
    );
  }

  /**
   * Avant l'effacement d'un compte qui ne détient que des pièces d'essai : elles reviennent à Certis,
   * par une cession inscrite dans leur chaîne. S'il détient une vraie pièce, rien ne bouge, et
   * l'effacement sera refusé (S-01).
   */
  async reclaimTrialPieces(userId: string) {
    const owned = await this.prisma.asset.findMany({
      where: { ownerId: userId },
      include: { issuer: true },
    });
    if (owned.length === 0 || owned.some((asset) => !asset.issuer.trial)) {
      return;
    }
    const account = await this.trialAccount();
    for (const asset of owned) {
      await this.prisma.$transaction(async (tx) => {
        await this.registry.append(tx, asset, 'TRANSFER', {
          from: this.registry.actorRef(asset.id, userId),
          to: this.registry.actorRef(asset.id, account.id),
        });
        await tx.asset.update({
          where: { id: asset.id },
          data: { ownerId: account.id },
        });
      });
    }
  }

  async findAll(ownerId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { ownerId },
      include: { issuer: true },
      orderBy: { createdAt: 'asc' },
    });
    const pending = await this.pendingFor(ownerId);
    return [
      ...pending.map((asset) => ({ ...this.summary(asset), pending: true })),
      ...assets.map((asset) => ({ ...this.summary(asset), pending: false })),
    ];
  }

  /** Les pièces qu'une maison a promises à ce compte : elles l'attendent, encore à la maison. */
  private async pendingFor(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const invitations = await this.prisma.invitation.findMany({
      where: { email: user.email },
      include: { asset: { include: { issuer: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return invitations
      .filter(
        (i) => i.asset.ownerId === i.createdById && i.asset.status === 'ACTIVE',
      )
      .map((i) => i.asset);
  }

  /** Vue du propriétaire : la pièce, son émetteur et sa provenance, où il se reconnaît. */
  async findOne(id: string, userId: string) {
    const waiting = (await this.pendingFor(userId)).find((a) => a.id === id);
    const asset = waiting ?? (await this.owned(id, userId));
    const [issuer, events, issuedBy] = await Promise.all([
      this.prisma.issuer.findUniqueOrThrow({ where: { id: asset.issuerId } }),
      this.prisma.event.findMany({
        where: { assetId: id },
        orderBy: { seq: 'asc' },
      }),
      this.face(asset.issuedById),
    ]);
    const me = this.registry.actorRef(id, userId);
    return {
      ...this.summary({ ...asset, issuer }),
      issuer: { id: issuer.id, name: issuer.name },
      issuedBy,
      pending: Boolean(waiting),
      // La dernière demande de révision, et les partages en cours : au propriétaire seulement.
      service: waiting
        ? null
        : await this.prisma.serviceRequest.findFirst({
            where: { assetId: id, ownerId: userId },
            orderBy: { requestedAt: 'desc' },
            select: {
              status: true,
              requestedAt: true,
              receivedAt: true,
              returnedAt: true,
            },
          }),
      shares: waiting
        ? []
        : await this.prisma.share.findMany({
            where: {
              assetId: id,
              ownerId: userId,
              expiresAt: { gt: new Date() },
            },
            select: { id: true, history: true, expiresAt: true },
            orderBy: { createdAt: 'desc' },
          }),
      // La carte de la pièce : à son détenteur seulement (maison ou propriétaire), pas au client qui attend.
      cardId: waiting ? null : asset.cardId,
      ...this.house(asset.reference, issuer.name),
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
      if (!asset) throw pieceNotFound();
      if ((asset.status === 'STOLEN') === stolen) {
        throw new ConflictException(
          stolen
            ? 'Cette montre est déjà déclarée volée : l’alerte est en place, rien d’autre à faire.'
            : 'Cette montre n’est pas déclarée volée : il n’y a pas d’alerte à lever.',
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
    if (!asset) {
      throw new NotFoundException(
        'Cette pièce est introuvable : vérifiez son lien ou son numéro de registre.',
      );
    }
    if (asset.issuerId !== issuerId) {
      throw new ForbiddenException(
        'Seul l’émetteur de cette pièce peut y enregistrer une révision : elle a été inscrite par une autre maison.',
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
    const asset = await this.prisma.asset.findUniqueOrThrow({
      where: { id },
      include: { issuer: true },
    });
    return this.publicView(asset, true);
  }

  /**
   * Ce que voit un tiers : par le QR présenté en personne, ou par un partage du propriétaire.
   * Sans `history`, seulement l'état du passeport : ni chaîne, ni fichier de preuve (ADR-0018).
   */
  async publicView(asset: Asset & { issuer: Issuer }, history: boolean) {
    const verifiedAt = new Date().toISOString();
    const result = await this.registry.verify(asset);
    if (result.problem) {
      return { valid: false, problem: result.problem, verifiedAt };
    }
    const stolenAt = result.stolen
      ? [...result.events].reverse().find((e) => e.type === 'STOLEN_REPORTED')
          ?.at
      : undefined;
    return {
      valid: true,
      verifiedAt,
      status: result.stolen ? 'STOLEN' : 'ACTIVE',
      stolenAt,
      // Pièce d'essai (ADR-0012) : l'interface le dit avant tout le reste.
      trial: asset.issuer.trial,
      // Le visage de la maison : hors du passeport signé, affiché à côté (principe « un visage »).
      issuedBy: await this.face(asset.issuedById),
      passport: result.payload,
      // Indication d'affichage (photo détourée), hors du passeport signé.
      imageCutout: asset.imageCutout,
      ...(history
        ? {
            provenance: result.events.map((e) => ({
              type: e.type,
              at: e.at,
              ...(e.type === 'SERVICE' ? { note: e.data.note } : {}),
            })),
            proof: {
              passport: asset.passport,
              events: result.events,
              anchors: result.anchors,
              keys: '/.well-known/certis-keys',
            },
          }
        : {}),
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
        'Vérifiez d’abord la pièce avec le QR du vendeur : le contrôle du numéro de série n’est ouvert que dans les 10 minutes qui suivent.',
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
  /**
   * La maison invite le client d'une pièce de son stock (ADR-0017). Le jeton n'est rendu qu'ici :
   * seule son empreinte est gardée. Une nouvelle invitation remplace la précédente.
   */
  async invite(
    assetId: string,
    house: { id: string; issuerId: string },
    email: string,
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        ownerId: house.id,
        issuerId: house.issuerId,
        status: 'ACTIVE',
      },
    });
    if (!asset) throw pieceNotFound();
    const token = randomBytes(32).toString('base64url');
    const cardId = asset.cardId ?? randomBytes(16).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_DAYS * 86_400_000);
    await this.prisma.$transaction([
      this.prisma.invitation.deleteMany({ where: { assetId } }),
      this.prisma.asset.update({ where: { id: assetId }, data: { cardId } }),
      this.prisma.invitation.create({
        data: {
          tokenHash: sha256(token),
          assetId,
          email,
          createdById: house.id,
          expiresAt,
        },
      }),
    ]);
    return { token, expiresAt: expiresAt.toISOString(), cardId };
  }

  /** Ce que voit le client qui ouvre son invitation : la pièce, la maison, son e-mail masqué. */
  async invitation(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: sha256(token) },
      include: { asset: { include: { issuer: true } } },
    });
    if (!invitation) throw invitationNotFound();
    if (invitation.expiresAt < new Date()) throw invitationExpired();
    const { asset } = invitation;
    return {
      email: invitation.email,
      view: {
        email: maskEmail(invitation.email),
        house: asset.issuer.name,
        issuedBy: await this.face(asset.issuedById),
        piece: {
          name: asset.name,
          brand: asset.brand,
          model: asset.model,
          reference: asset.reference,
          imageUrl: asset.imageUrl,
          imageCutout: asset.imageCutout,
        },
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  }

  /** La carte remise avec la pièce : au public, seulement l'état du passeport (principe 6). */
  async card(cardId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { cardId },
      include: { issuer: true, owner: true },
    });
    if (!asset) throw pieceNotFound();
    const piece = {
      name: asset.name,
      brand: asset.brand,
      model: asset.model,
      reference: asset.reference,
      imageUrl: asset.imageUrl,
      imageCutout: asset.imageCutout,
    };
    const base = { house: asset.issuer.name, piece };
    // Encore dans le stock de la maison : la carte s'active à la remise.
    if (asset.owner.issuerId === asset.issuerId)
      return { ...base, state: 'pending' };
    const result = await this.registry.verify(asset);
    if (result.problem) return { ...base, state: 'unconfirmed' };
    if (!result.stolen) return { ...base, state: 'verified' };
    const report = await this.prisma.event.findFirst({
      where: { assetId: asset.id, type: 'STOLEN_REPORTED' },
      orderBy: { seq: 'desc' },
    });
    return { ...base, state: 'stolen', stolenAt: report?.at.toISOString() };
  }

  /** Droit à l'effacement : les invitations adressées à cet e-mail disparaissent avec le compte. */
  async forgetInvitations(email: string) {
    await this.prisma.invitation.deleteMany({ where: { email } });
  }

  /** Le visage de la personne qui a inscrit la pièce, si la maison l'a renseigné (hors passeport). */
  private async face(userId: string | null) {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.displayName
      ? { name: user.displayName, title: user.title, photoUrl: user.photoUrl }
      : null;
  }

  /** Ce que la maison raconte : l'histoire de la référence, et ses liens (catalogue de démo). */
  private house(reference: string, issuerName: string) {
    const entry = CATALOG.find((e) => e.reference === reference);
    return {
      story: entry?.story ?? null,
      links: issuerName === DEMO_HOUSE ? DEMO_LINKS : [],
    };
  }

  private async owned(id: string, ownerId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, ownerId } });
    if (!asset) throw pieceNotFound();
    return asset;
  }

  private summary(asset: Asset & { issuer: Issuer }) {
    return {
      id: asset.id,
      trial: asset.issuer.trial,
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
