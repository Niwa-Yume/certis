import { Injectable, NotFoundException } from '@nestjs/common';
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
    const integrityHash = this.crypto.sign({
      brand: dto.brand,
      model: dto.model,
      reference: dto.reference,
      ownerId,
    });

    return this.prisma.asset.create({
      data: {
        ...dto,
        ownerId,
        integrityHash,
      },
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
  issueVerification(id: string, ownerId: string) {
    return this.nonce.issue(id, ownerId, 'VERIFY');
  }

  // Consomme un nonce de vérification lié à cette montre, puis vérifie la signature.
  async authenticate(id: string, nonceValue: string) {
    await this.nonce.consume(nonceValue, id, 'VERIFY');
    return this.verify(id);
  }
}
