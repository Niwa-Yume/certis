import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    async consume(nonceValue: string): Promise<void>;
    async consume(nonceValue: string, prismaClient: Prisma.TransactionClient | PrismaService): Promise<void>;
    async consume(nonceValue: string, prismaClient: Prisma.TransactionClient | PrismaService = this.prisma): Promise<void> {
        const nonce = await prismaClient.authNonce.findUnique({
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

        await prismaClient.authNonce.update({
            where: { nonceValue },
            data: {
                used: true,
                usedAt: new Date(),
            },
        });
    }
}