import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { sha256 } from '../crypto/crypto.service';
import { pieceNotFound } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from '../registry/registry.service';
import { AssetService } from './asset.service';

const requestNotFound = () =>
  new NotFoundException(
    'Cette demande de révision est introuvable : rechargez la liste des révisions.',
  );
const shareGone = () =>
  new GoneException(
    'Ce partage n’est plus valable : demandez au propriétaire un nouveau lien.',
  );

/**
 * La relation continue (ADR-0018) : la révision demandée par le propriétaire et suivie par sa
 * maison en trois étapes, et le partage qu'il choisit, à durée limitée, révocable.
 */
@Injectable()
export class RelationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: RegistryService,
    private readonly assets: AssetService,
  ) {}

  private async owned(id: string, ownerId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, ownerId } });
    if (!asset) throw pieceNotFound();
    return asset;
  }

  async requestService(assetId: string, ownerId: string) {
    const asset = await this.owned(assetId, ownerId);
    if (asset.status === 'STOLEN') {
      throw new HttpException(
        'Cette montre est déclarée volée : elle ne peut pas partir en révision. Si elle a été retrouvée, déclarez-la retrouvée d’abord.',
        HttpStatus.LOCKED,
      );
    }
    // Une demande à la fois, par propriétaire : celle d'un ancien propriétaire ne bloque pas le nouveau (ADR-0019).
    const open = await this.prisma.serviceRequest.findFirst({
      where: { assetId, ownerId, status: { not: 'RETURNED' } },
    });
    if (open) {
      throw new ConflictException(
        'Une révision est déjà en cours pour cette pièce : suivez son avancement sur sa fiche.',
      );
    }
    const request = await this.prisma.serviceRequest.create({
      data: { assetId, ownerId },
    });
    return {
      id: request.id,
      status: request.status,
      requestedAt: request.requestedAt,
    };
  }

  /** La file de la maison : les demandes en cours sur les pièces qu'elle a émises. */
  async queue(issuerId: string) {
    const requests = await this.prisma.serviceRequest.findMany({
      where: { status: { not: 'RETURNED' }, asset: { issuerId } },
      include: { asset: true, owner: true },
      orderBy: { requestedAt: 'asc' },
    });
    // Une demande ne vaut que pour celui qui possède encore la pièce : après une cession, elle sort de la file.
    return requests
      .filter((r) => r.ownerId === r.asset.ownerId)
      .map((r) => ({
        id: r.id,
        status: r.status,
        requestedAt: r.requestedAt,
        receivedAt: r.receivedAt,
        // Le propriétaire a demandé la révision : la maison reçoit son e-mail pour convenir du dépôt.
        owner: r.owner.email,
        piece: {
          id: r.asset.id,
          name: r.asset.name,
          model: r.asset.model,
          reference: r.asset.reference,
          imageUrl: r.asset.imageUrl,
          imageCutout: r.asset.imageCutout,
        },
      }));
  }

  private async houseRequest(id: string, issuerId: string) {
    const request = await this.prisma.serviceRequest.findFirst({
      where: { id, asset: { issuerId } },
      include: { asset: true },
    });
    if (!request || request.ownerId !== request.asset.ownerId)
      throw requestNotFound();
    return request;
  }

  async receive(id: string, issuerId: string) {
    const request = await this.houseRequest(id, issuerId);
    if (request.status !== 'REQUESTED') {
      throw new ConflictException(
        'Cette pièce est déjà en atelier, ou déjà rendue : rechargez la liste des révisions.',
      );
    }
    await this.prisma.serviceRequest.update({
      where: { id },
      data: { status: 'IN_WORKSHOP', receivedAt: new Date() },
    });
    return { status: 'IN_WORKSHOP' };
  }

  /** Le retour : la révision entre dans l'histoire signée de la pièce, dans la même transaction. */
  async giveBack(id: string, issuerId: string, note: string) {
    const request = await this.houseRequest(id, issuerId);
    if (request.status !== 'IN_WORKSHOP') {
      throw new ConflictException(
        'Cette pièce n’est pas en atelier : recevez-la d’abord, ou rechargez la liste des révisions.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id },
        data: { status: 'RETURNED', returnedAt: new Date() },
      });
      await this.registry.append(tx, request.asset, 'SERVICE', {
        issuer: issuerId,
        note,
      });
    });
    return { status: 'RETURNED' };
  }

  /** Le propriétaire partage, et lui seul : un lien à durée limitée, avec ou sans l'histoire. */
  async share(
    assetId: string,
    ownerId: string,
    hours: number,
    history: boolean,
  ) {
    await this.owned(assetId, ownerId);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + hours * 3_600_000);
    const share = await this.prisma.share.create({
      data: { tokenHash: sha256(token), assetId, ownerId, history, expiresAt },
    });
    return { id: share.id, token, history, expiresAt: expiresAt.toISOString() };
  }

  async stopSharing(assetId: string, ownerId: string, shareId: string) {
    await this.owned(assetId, ownerId);
    // Arrêté plutôt qu'effacé : celui qui ouvre encore le lien lit « plus valable », pas « introuvable ».
    await this.prisma.share.updateMany({
      where: { id: shareId, assetId, ownerId },
      data: { expiresAt: new Date() },
    });
    return { stopped: true };
  }

  /** Ce que voit celui qui a reçu le lien. Plus rien si la pièce a changé de mains. */
  async open(token: string) {
    const share = await this.prisma.share.findUnique({
      where: { tokenHash: sha256(token) },
      include: { asset: { include: { issuer: true } } },
    });
    if (!share) {
      throw new NotFoundException(
        'Ce partage est introuvable : vérifiez le lien, ou demandez-en un nouveau au propriétaire.',
      );
    }
    if (share.expiresAt < new Date() || share.asset.ownerId !== share.ownerId)
      throw shareGone();
    return this.assets.publicView(share.asset, share.history);
  }
}
