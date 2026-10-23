import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import type { Asset } from '@prisma/client';
import { readEnv } from '../config/env';
import { canonicalJson } from './canonical-json';

export type SignedAssetFields = Pick<
  Asset,
  | 'id'
  | 'name'
  | 'brand'
  | 'model'
  | 'reference'
  | 'status'
  | 'imageUrl'
  | 'ownerId'
>;

/**
 * Payload signé, version 1 (AUDIT S6) : l'identifiant de l'actif (pas de transplantation
 * entre montres identiques), tout ce qui est affiché, et une version pour faire évoluer le format.
 */
export function assetPayload(asset: SignedAssetFields) {
  return {
    v: 1,
    assetId: asset.id,
    name: asset.name,
    brand: asset.brand,
    model: asset.model,
    reference: asset.reference,
    status: asset.status,
    imageUrl: asset.imageUrl ?? null,
    ownerId: asset.ownerId,
  };
}

@Injectable()
export class CryptoService {
  private readonly privateKey: crypto.KeyObject;
  // Dérivée de la clé privée : une seule variable d'environnement, aucune paire incohérente possible.
  private readonly publicKey: crypto.KeyObject;

  constructor() {
    this.privateKey = readEnv().signingKey;
    this.publicKey = crypto.createPublicKey(this.privateKey);
  }

  signAsset(asset: SignedAssetFields): string {
    return crypto
      .sign('sha256', this.bytes(asset), this.privateKey)
      .toString('base64');
  }

  verifyAsset(asset: SignedAssetFields, signature: string): boolean {
    return crypto.verify(
      'sha256',
      this.bytes(asset),
      this.publicKey,
      Buffer.from(signature, 'base64'),
    );
  }

  private bytes(asset: SignedAssetFields) {
    return Buffer.from(canonicalJson(assetPayload(asset)), 'utf8');
  }
}
