import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

    async transfer(assetId: string, toOwnerId: string, currentUserId: string) {
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new NotFoundException(`Asset ${assetId} introuvable`);
        if (asset.ownerId !== currentUserId) {
            throw new ForbiddenException('Seul le proprietaire actuel peut transferer cet asset');
        }

        await this.prisma.transfer.create({
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

        return this.prisma.asset.update({
            where: { id: assetId },
            data: {
                ownerId: toOwnerId,
                integrityHash,
            },
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
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new NotFoundException(`Asset ${assetId} introuvable`);

        // Valide et consomme le nonce (one-time, 30s)
        await this.nonce.consume(nonceValue);

        await this.prisma.transfer.create({
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

        return this.prisma.asset.update({
            where: { id: assetId },
            data: { ownerId: newOwnerId, integrityHash },
        });
    }
}