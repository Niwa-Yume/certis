import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
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

  async create(dto: CreateAssetDto, ownerId: string) {
    // Champs listés un à un : le client ne fixe ni l'id, ni le statut, ni le propriétaire (AUDIT N8).
    // L'id est connu avant l'insertion car il fait partie du payload signé.
    const asset = {
      id: randomUUID(),
      name: dto.name,
      brand: dto.brand,
      model: dto.model,
      reference: dto.reference,
      status: AssetStatus.ACTIVE,
      imageUrl: dto.imageUrl ?? null,
      ownerId,
    };
    return this.prisma.asset.create({
      data: { ...asset, signature: this.crypto.signAsset(asset) },
    });
  }

  async findAll(ownerId: string) {
    return this.prisma.asset.findMany({ where: { ownerId } });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} introuvable`);
    return asset;
  }

  async verify(id: string): Promise<{ valid: boolean }> {
    const asset = await this.findOne(id);
    return { valid: this.crypto.verifyAsset(asset, asset.signature) };
  }

  issueVerification(id: string, ownerId: string) {
    return this.nonce.issue(id, ownerId, 'VERIFY');
  }

  // Consomme un nonce de vérification lié à cette montre, puis vérifie la signature.
  async authenticate(id: string, nonceValue: string) {
    await this.nonce.consume(nonceValue, id, 'VERIFY');
    return this.verify(id);
  }
}
