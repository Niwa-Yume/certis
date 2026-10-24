import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { readEnv } from '../config/env';
import { canonicalJson } from './canonical-json';

export type PublicJwk = { kty: string; crv: string; x: string; y: string };

export type Jws<T> = {
  header: { alg: string; kid: string; typ?: string };
  payload: T;
  signingInput: string;
  signature: string;
};

export const sha256 = (data: string) =>
  crypto.createHash('sha256').update(data).digest('base64url');

export function publicJwkOf(key: crypto.KeyObject): PublicJwk {
  const { kty, crv, x, y } = crypto
    .createPublicKey(key)
    .export({ format: 'jwk' }) as PublicJwk;
  return { kty, crv, x, y };
}

/** Empreinte RFC 7638 : l'identifiant d'une clé est calculé, jamais choisi. */
export function thumbprint({ crv, kty, x, y }: PublicJwk): string {
  return sha256(JSON.stringify({ crv, kty, x, y }));
}

/** ES256 au format JOSE : r‖s sur 64 octets plutôt que DER (RFC 7518, §3.4). */
export function sign(bytes: string, key: crypto.KeyObject): string {
  return crypto
    .sign('sha256', Buffer.from(bytes), { key, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
}

export function verifySignature(
  bytes: string,
  signature: string,
  key: crypto.KeyObject,
): boolean {
  return crypto.verify(
    'sha256',
    Buffer.from(bytes),
    { key, dsaEncoding: 'ieee-p1363' },
    Buffer.from(signature, 'base64url'),
  );
}

/** JWS compacte ES256 (RFC 7515) dont le contenu est le JSON canonique (RFC 8785) du payload. */
export function signJws(
  payload: unknown,
  key: crypto.KeyObject,
  kid: string,
  typ: string,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid, typ }),
  ).toString('base64url');
  const body = Buffer.from(canonicalJson(payload)).toString('base64url');
  return `${header}.${body}.${sign(`${header}.${body}`, key)}`;
}

/** Décode sans vérifier : la vérification exige la clé, que l'appelant résout par `kid`. */
export function decodeJws<T>(jws: string): Jws<T> | null {
  const [header, body, signature] = jws.split('.');
  if (!header || !body || !signature) return null;
  try {
    return {
      header: JSON.parse(
        Buffer.from(header, 'base64url').toString(),
      ) as Jws<T>['header'],
      payload: JSON.parse(Buffer.from(body, 'base64url').toString()) as T,
      signingInput: `${header}.${body}`,
      signature,
    };
  } catch {
    return null;
  }
}

@Injectable()
export class CryptoService {
  /** La plateforme signe ce qu'elle constate : cessions, vols, restitutions (ADR-0003). */
  readonly platformKey: crypto.KeyObject;
  readonly platformJwk: PublicJwk;
  readonly platformKid: string;
  private readonly masterKey: Buffer;

  constructor() {
    const env = readEnv();
    this.platformKey = env.signingKey;
    this.platformJwk = publicJwkOf(env.signingKey);
    this.platformKid = thumbprint(this.platformJwk);
    this.masterKey = env.masterKey;
  }

  /** AES-256-GCM : `iv.tag.chiffré`, en base64url. Une base volée seule ne livre aucune clé. */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const sealed = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return [iv, cipher.getAuthTag(), sealed]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  decrypt(token: string): string {
    const [iv, tag, sealed] = token
      .split('.')
      .map((part) => Buffer.from(part, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(sealed),
      decipher.final(),
    ]).toString();
  }

  /** Un secret par usage, dérivé de la clé maîtresse (HKDF) : aucun secret de plus à gérer. */
  derive(purpose: string): Buffer {
    return Buffer.from(
      crypto.hkdfSync('sha256', this.masterKey, '', `certis/${purpose}`, 32),
    );
  }
}
