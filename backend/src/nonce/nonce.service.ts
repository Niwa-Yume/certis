import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NoncePurpose, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

// Vérification : scan pendant l'inspection. Transfert : l'acheteur doit se connecter puis confirmer.
const TTL_SECONDS: Record<NoncePurpose, number> = { VERIFY: 60, TRANSFER: 300 };

@Injectable()
export class NonceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seul le propriétaire actuel de l'actif peut émettre un nonce (AUDIT S2). */
  async issue(
    assetId: string,
    issuerId: string,
    purpose: NoncePurpose,
    recipientId?: string,
  ) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException(`Asset ${assetId} introuvable`);
    if (asset.ownerId !== issuerId) {
      throw new ForbiddenException('Seul le propriétaire peut générer ce QR');
    }

    const nonce = await this.prisma.authNonce.create({
      data: {
        nonceValue: randomUUID(),
        purpose,
        assetId,
        issuedById: issuerId,
        recipientId,
        expiresAt: new Date(Date.now() + TTL_SECONDS[purpose] * 1000),
      },
    });
    return { nonce: nonce.nonceValue, expiresAt: nonce.expiresAt };
  }

  /**
   * Consomme un nonce lié à cet actif et à cette finalité (AUDIT S3, S4), une seule fois (S5).
   * Les contrôles de liaison portent sur des champs immuables ; l'unicité de la consommation
   * repose sur un UPDATE conditionnel, que PostgreSQL réévalue après verrou : un seul gagnant.
   */
  async consume(
    nonceValue: string,
    assetId: string,
    purpose: NoncePurpose,
    consumerId?: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const nonce = await client.authNonce.findUnique({ where: { nonceValue } });
    if (!nonce || nonce.assetId !== assetId || nonce.purpose !== purpose) {
      throw new ForbiddenException('QR invalide pour cette montre');
    }
    if (nonce.recipientId && nonce.recipientId !== consumerId) {
      throw new ForbiddenException(
        'Cette offre est réservée à un autre destinataire',
      );
    }

    const now = new Date();
    const { count } = await client.authNonce.updateMany({
      where: { id: nonce.id, used: false, expiresAt: { gt: now } },
      data: { used: true, usedAt: now },
    });
    if (count !== 1) {
      // Encore valide à la lecture mais refusé à l'écriture : quelqu'un l'a consommé entre-temps.
      const expired = !nonce.used && nonce.expiresAt <= now;
      throw new GoneException(expired ? 'Nonce expiré' : 'Nonce déjà utilisé');
    }
    return nonce;
  }
}
