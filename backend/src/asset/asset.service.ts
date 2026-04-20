import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService,
    ) {}

    async create(dto: CreateAssetDto) {
        const integrityHash = this.crypto.sign({
            brand: dto.brand,
            model: dto.model,
            reference: dto.reference,
            ownerId: dto.ownerId,
        });

        return this.prisma.asset.create({
            data: {
                ...dto,
                integrityHash,
            },
        });
    }

    async findAll() {
        return this.prisma.asset.findMany();
    }

    async findOne(id: string) {
        return this.prisma.asset.findUniqueOrThrow({
            where: { id },
        });
    }

    async verify(id: string): Promise<{ valid: boolean }> {
        const asset = await this.prisma.asset.findUniqueOrThrow({
            where: { id },
        });

        const valid = this.crypto.verify(
            {
                brand: asset.brand,
                model: asset.model,
                reference: asset.reference,
                ownerId: asset.ownerId,
            },
            asset.integrityHash,
        );

        return { valid };
    }
}