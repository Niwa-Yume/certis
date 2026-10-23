import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { NonceService } from '../nonce/nonce.service';

@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly nonce: NonceService,
  ) {}

  /** Étape 1 : le propriétaire émet une offre (QR), éventuellement réservée à un destinataire. */
  async createOffer(assetId: string, ownerId: string, recipientEmail?: string) {
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

  /** Réservé au propriétaire actuel : la liste contient les ids des anciens propriétaires (AUDIT S8). */
  async getHistory(assetId: string, ownerId: string) {
    const owned = await this.prisma.asset.count({
      where: { id: assetId, ownerId },
    });
    if (!owned) throw new NotFoundException(`Asset ${assetId} introuvable`);
    return this.prisma.transfer.findMany({
      where: { assetId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Étape 2 : le destinataire scanne le QR et accepte. Tout ou rien, une seule fois. */
  async claim(assetId: string, nonceValue: string, newOwnerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({ where: { id: assetId } });
      if (!asset) throw new NotFoundException(`Asset ${assetId} introuvable`);
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

      const signature = this.crypto.signAsset({
        ...asset,
        ownerId: newOwnerId,
      });
      // Garde optimiste : la montre appartient toujours à celui qui a émis l'offre.
      const moved = await tx.asset.updateMany({
        where: { id: assetId, ownerId: offer.issuedById },
        data: { ownerId: newOwnerId, signature },
      });
      if (moved.count !== 1) {
        throw new ConflictException(
          "La montre a changé de propriétaire depuis l'émission du QR",
        );
      }

      await tx.transfer.create({
        data: { assetId, fromOwnerId: offer.issuedById, toOwnerId: newOwnerId },
      });
      return tx.asset.findUniqueOrThrow({ where: { id: assetId } });
    });
  }
}
