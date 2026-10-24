import { Injectable } from '@nestjs/common';
import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  KeyObject,
} from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CryptoService,
  PublicJwk,
  publicJwkOf,
  thumbprint,
} from '../crypto/crypto.service';

export type PublishedKey = PublicJwk & {
  kid: string;
  use: 'sig';
  alg: 'ES256';
  /** Identifiant de l'émetteur, ou `certis` pour la plateforme : qui a le droit de signer quoi. */
  issuer: string;
};

/** Le `issuer` de la plateforme dans la JWKS. */
export const PLATFORM = 'certis';

@Injectable()
export class IssuerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async create(name: string) {
    const issuer = await this.prisma.issuer.create({ data: { name } });
    await this.rotateKey(issuer.id);
    return issuer;
  }

  /** Rattache un compte à un émetteur : il pourra inscrire des pièces en son nom (ADR-0003). */
  grant(userId: string, issuerId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ISSUER', issuerId },
    });
  }

  /** Nouvelle clé active. L'ancienne est retirée mais reste publiée : les passeports émis restent vérifiables. */
  async rotateKey(issuerId: string) {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const publicJwk = publicJwkOf(privateKey);
    const kid = thumbprint(publicJwk);
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    await this.prisma.$transaction([
      this.prisma.issuerKey.updateMany({
        where: { issuerId, retiredAt: null },
        data: { retiredAt: new Date() },
      }),
      this.prisma.issuerKey.create({
        data: {
          kid,
          issuerId,
          publicJwk,
          privateKey: this.crypto.encrypt(pem),
        },
      }),
    ]);
    return kid;
  }

  async signingKey(issuerId: string): Promise<{ kid: string; key: KeyObject }> {
    const { kid, privateKey } = await this.prisma.issuerKey.findFirstOrThrow({
      where: { issuerId, retiredAt: null },
    });
    return { kid, key: createPrivateKey(this.crypto.decrypt(privateKey)) };
  }

  /** JWKS publique (RFC 7517) : la clé plateforme et toutes les clés d'émetteurs, retirées comprises. */
  async jwks(): Promise<{ keys: PublishedKey[] }> {
    const keys = await this.prisma.issuerKey.findMany({
      orderBy: { createdAt: 'asc' },
    });
    const published = (jwk: PublicJwk, kid: string, issuer: string) => ({
      ...jwk,
      kid,
      use: 'sig' as const,
      alg: 'ES256' as const,
      issuer,
    });
    return {
      keys: [
        published(this.crypto.platformJwk, this.crypto.platformKid, PLATFORM),
        ...keys.map((k) =>
          published(k.publicJwk as PublicJwk, k.kid, k.issuerId),
        ),
      ],
    };
  }

  /** Les clés publiques par `kid`, pour vérifier passeports et événements. */
  async publicKeys(): Promise<Map<string, { key: KeyObject; issuer: string }>> {
    const { keys } = await this.jwks();
    return new Map(
      keys.map(({ kid, issuer, kty, crv, x, y }) => [
        kid,
        {
          key: createPublicKey({ key: { kty, crv, x, y }, format: 'jwk' }),
          issuer,
        },
      ]),
    );
  }

  /**
   * Empreinte du numéro de série (ADR-0005) : HMAC à secret d'émetteur, car l'espace des numéros
   * est trop petit pour qu'un hash public résiste à la force brute.
   */
  serialHash(issuerId: string, serial: string): string {
    const normalized = serial
      .normalize('NFKC')
      .toUpperCase()
      .replace(/[\s-]/g, '');
    return createHmac('sha256', this.crypto.derive(`serial:${issuerId}`))
      .update(normalized)
      .digest('base64url');
  }
}
