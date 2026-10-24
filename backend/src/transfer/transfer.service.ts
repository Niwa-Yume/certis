import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NonceService } from '../nonce/nonce.service';
import { RegistryService } from '../registry/registry.service';

// Tant qu'une pièce est déclarée volée, elle ne change pas de mains (ADR-0006).
const stolen = () =>
  new HttpException(
    'Cette montre est déclarée volée : elle ne peut pas changer de propriétaire.',
    HttpStatus.LOCKED,
  );

@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nonce: NonceService,
    private readonly registry: RegistryService,
  ) {}

  /** Étape 1 : le propriétaire émet une offre (QR), éventuellement réservée à un destinataire. */
  async createOffer(assetId: string, ownerId: string, recipientEmail?: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (asset?.ownerId === ownerId && asset.status === 'STOLEN') throw stolen();

    let recipientId: string | undefined;
    if (recipientEmail) {
      const recipient = await this.prisma.user.findUnique({
        where: { email: recipientEmail },
      });
      if (!recipient) throw new NotFoundException('Destinataire introuvable');
      recipientId = recipient.id;
    }
    return this.nonce.issue(assetId, ownerId, 'TRANSFER', recipientId);
  }

  /** Étape 2 : le destinataire scanne le QR et accepte. Tout ou rien, une seule fois. */
  async claim(assetId: string, nonceValue: string, newOwnerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({ where: { id: assetId } });
      if (!asset) throw new NotFoundException(`Asset ${assetId} introuvable`);
      if (asset.status === 'STOLEN') throw stolen();
      if (asset.ownerId === newOwnerId) {
        throw new ConflictException(
          'Vous êtes déjà propriétaire de cette montre',
        );
      }

      const offer = await this.nonce.consume(
        nonceValue,
        assetId,
        'TRANSFER',
        newOwnerId,
        tx,
      );

      // Garde optimiste : la montre appartient toujours à celui qui a émis l'offre.
      const moved = await tx.asset.updateMany({
        where: { id: assetId, ownerId: offer.issuedById, status: 'ACTIVE' },
        data: { ownerId: newOwnerId },
      });
      if (moved.count !== 1) {
        throw new ConflictException(
          "La montre a changé de propriétaire depuis l'émission du QR",
        );
      }

      // Le passeport ne change pas : la cession est un maillon de la chaîne, signé par la plateforme.
      await this.registry.append(tx, asset, 'TRANSFER', {
        from: this.registry.actorRef(assetId, offer.issuedById),
        to: this.registry.actorRef(assetId, newOwnerId),
      });
      return { id: assetId, transferred: true };
    });
  }
}
