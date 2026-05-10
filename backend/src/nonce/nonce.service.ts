import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class NonceService {
    constructor(private readonly prisma: PrismaService) {}

    async generate(assetId: string) {
        const nonceValue = randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 1000);

        const nonce = await this.prisma.authNonce.create({
            data: {
                nonceValue,
                expiresAt,
                assetId,
            },
        });

        return { nonce: nonce.nonceValue, expiresAt: nonce.expiresAt };
    }

    async consume(nonceValue: string): Promise<void> {
        const nonce = await this.prisma.authNonce.findUnique({
            where: { nonceValue },
        });

        if (!nonce) {
            throw new NotFoundException('Nonce introuvable');
        }

        if (nonce.used) {
            throw new GoneException('Nonce déjà utilisé');
        }

        if (new Date() > nonce.expiresAt) {
            throw new GoneException('Nonce expiré');
        }

        await this.prisma.authNonce.update({
            where: { nonceValue },
            data: {
                used: true,
                usedAt: new Date(),
            },
        });
    }
}