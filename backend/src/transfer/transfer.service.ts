import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class TransferService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService,
    ) {}

    async transfer(assetId: string, toOwnerId: string) {
        const asset = await this.prisma.asset.findUniqueOrThrow({
            where: { id: assetId },
        });

        // 1. Enregistrer le transfert
        await this.prisma.transfer.create({
            data: {
                assetId,
                fromOwnerId: asset.ownerId,
                toOwnerId,
            },
        });

        // 2. Recalculer la signature ECDSA avec le nouveau ownerId
        const integrityHash = this.crypto.sign({
            brand: asset.brand,
            model: asset.model,
            reference: asset.reference,
            ownerId: toOwnerId,
        });

        // 3. Mettre à jour l'asset
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
}