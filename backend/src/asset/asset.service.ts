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

  /**
   * Avec ownerId : lecture réservée au propriétaire, 404 sinon pour ne pas confirmer
   * l'existence d'une montre d'autrui (AUDIT S8). Sans : usage interne (vérification par nonce).
   */
  async findOne(id: string, ownerId?: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, ownerId } });
    if (!asset) throw new NotFoundException(`Asset ${id} introuvable`);
    return asset;
  }

  async verify(id: string, ownerId?: string): Promise<{ valid: boolean }> {
    const asset = await this.findOne(id, ownerId);
    return { valid: this.crypto.verifyAsset(asset, asset.signature) };
  }

  issueVerification(id: string, ownerId: string) {
    return this.nonce.issue(id, ownerId, 'VERIFY');
  }

  /**
   * Consomme un nonce de vérification lié à cette montre, puis vérifie la signature.
   * Si elle est valide, l'acheteur reçoit de quoi comparer le certificat à la pièce :
   * données publiques et provenance datée, jamais d'identité (ADR-0009).
   */
  async authenticate(id: string, nonceValue: string) {
    await this.nonce.consume(nonceValue, id, 'VERIFY');
    const asset = await this.prisma.asset.findUniqueOrThrow({
      where: { id },
      include: { transfers: { orderBy: { createdAt: 'asc' } } },
    });
    const verifiedAt = new Date().toISOString();
    if (!this.crypto.verifyAsset(asset, asset.signature)) {
      return { valid: false, verifiedAt };
    }
    return {
      valid: true,
      verifiedAt,
      asset: {
        id: asset.id,
        name: asset.name,
        brand: asset.brand,
        model: asset.model,
        reference: asset.reference,
        imageUrl: asset.imageUrl,
        registeredAt: asset.createdAt,
      },
      provenance: [
        { event: 'REGISTERED', at: asset.createdAt },
        ...asset.transfers.map((t) => ({
          event: 'TRANSFERRED',
          at: t.createdAt,
        })),
      ],
      proof: {
        algorithm: 'ECDSA P-256 / SHA-256',
        format: 'JCS (RFC 8785) v1',
        signature: asset.signature,
      },
    };
  }
}
