import {Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { NonceService } from '../nonce/nonce.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService,
        private readonly nonce: NonceService,
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
        const asset = await this.prisma.asset.findUnique({ where: { id } });
        if (!asset) throw new NotFoundException(`Asset ${id} introuvable`);
        return asset;
    }

    async verify(id: string): Promise<{ valid: boolean }> {
        const asset = await this.findOne(id);

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
    //Vérifie si l'asset existe et si le hash est valide, puis génère un nonce pour l'authentification

    async generateNonce(id: string) {
        await this.findOne(id);
        return this.nonce.generate(id);
    }
    // Consomme le nonce puis verifie la signature
    async authenticate(id: string, nonceValue: string) {
        await this.nonce.consume(nonceValue);
        return this.verify(id);
    }
}
