import { ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class TransferService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService,
    ) {}

    async transfer(assetId: string, toOwnerId: string, currentUserId: string) {
        return this.prisma.$transaction(async (tx) => {
            const asset = await tx.asset.findUnique({ where: { id: assetId } });
            if (!asset) throw new NotFoundException(`Asset ${assetId} introuvable`);
            if (asset.ownerId !== currentUserId) {
                throw new ForbiddenException('Seul le proprietaire actuel peut transferer cet asset');
            }

            await tx.transfer.create({
                data: {
                    assetId,
                    fromOwnerId: currentUserId,
                    toOwnerId,
                },
            });

            const integrityHash = this.crypto.sign({
                brand: asset.brand,
                model: asset.model,
                reference: asset.reference,
                ownerId: toOwnerId,
            });

            return tx.asset.update({
                where: { id: assetId },
                data: {
                    ownerId: toOwnerId,
                    integrityHash,
                },
            });
        });
    }

    async getHistory(assetId: string) {
        return this.prisma.transfer.findMany({
            where: { assetId },
            orderBy: { createdAt: 'asc' },
        });
    }

    // Le receveur scanne le QR et claim l'asset grâce au nonce généré par le propriétaire.
    async claim(assetId: string, nonceValue: string, newOwnerId: string) {
        return this.prisma.$transaction(async (tx) => {
            const asset = await tx.asset.findUnique({ where: { id: assetId } });
            if (!asset) throw new NotFoundException(`Asset ${assetId} introuvable`);

            // Consomme le nonce dans la meme transaction que le transfert.
            const nonce = await tx.authNonce.findUnique({ where: { nonceValue } });
            if (!nonce) {
                throw new NotFoundException('Nonce introuvable');
            }
            if (nonce.used) {
                throw new GoneException('Nonce déjà utilisé');
            }
            if (new Date() > nonce.expiresAt) {
                throw new GoneException('Nonce expiré');
            }

            await tx.authNonce.update({
                where: { nonceValue },
                data: { used: true, usedAt: new Date() },
            });

            await tx.transfer.create({
                data: {
                    assetId,
                    fromOwnerId: asset.ownerId,
                    toOwnerId: newOwnerId,
                },
            });

            const integrityHash = this.crypto.sign({
                brand: asset.brand,
                model: asset.model,
                reference: asset.reference,
                ownerId: newOwnerId,
            });

            return tx.asset.update({
                where: { id: assetId },
                data: { ownerId: newOwnerId, integrityHash },
            });
        });
    }
}