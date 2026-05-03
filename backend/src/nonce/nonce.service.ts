import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class NonceService {
    constructor(private readonly prisma: PrismaService) {}

    async generate(assetId: string) {
        const nonceValue = randomUUID();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

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
            throw new Error('NONCE_NOT_FOUND');
        }

        if (nonce.used) {
            throw new Error('NONCE_ALREADY_USED');
        }

        if (new Date() > nonce.expiresAt) {
            throw new Error('NONCE_EXPIRED');
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