import {Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class TransferService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService,
    ) {}

    async transfer(assetId: string, toOwnerId: string) {
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new NotFoundException(`Asset ${assetId} introuvable`);

        await this.prisma.transfer.create({
            data: {
                assetId,
                fromOwnerId: asset.ownerId,
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
}