import { ConflictException, Injectable } from '@nestjs/common';
import { Asset, Event, EventType, Prisma } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { canonicalJson } from '../crypto/canonical-json';
import {
  CryptoService,
  decodeJws,
  sha256,
  sign,
  verifySignature,
} from '../crypto/crypto.service';
import {
  IssuerService,
  PLATFORM,
  VerificationKey,
} from '../issuer/issuer.service';
import { AnchorService } from './anchor.service';

export type PassportPayload = {
  v: 2;
  type: 'CertisPassport';
  issuer: { id: string; name: string };
  validFrom: string;
  credentialSubject: {
    id: string;
    brand: string;
    model: string;
    name: string;
    reference: string;
    specs: Record<'movement' | 'case' | 'dial' | 'bracelet', string | null>;
    serialHash: string;
    image: string | null;
  };
};

/** Un maillon tel qu'exporté : ce que le vérificateur indépendant recalcule (tools/verify). */
export type ChainEvent = {
  seq: number;
  type: EventType;
  at: string;
  data: Record<string, string>;
  prevHash: string | null;
  hash: string;
  kid: string;
  signature: string;
};

export type Problem = 'passport' | 'chain' | 'registry';

type Keys = Map<string, VerificationKey>;

/**
 * Signé par une clé révoquée, à sa date de révocation ou après (ADR-0011). Une date illisible
 * compte comme postérieure. La date est celle que déclare le signataire : hors du registre,
 * seul un ancrage horodaté empêcherait de l'antidater.
 */
const signedAfterRevocation = (key: VerificationKey, date: string) =>
  key.revokedAt !== undefined && !(Date.parse(date) < key.revokedAt);

// La plateforme signe ce qu'elle constate ; l'émetteur signe ce qu'il atteste (ADR-0003).
const SIGNED_BY_PLATFORM = new Set<EventType>([
  'TRANSFER',
  'STOLEN_REPORTED',
  'RECOVERED',
]);

/** Octets hachés et signés d'un maillon : tout, sauf son hash et sa signature. */
export const eventBytes = (
  assetId: string,
  e: Pick<ChainEvent, 'seq' | 'type' | 'at' | 'data' | 'prevHash'>,
) =>
  canonicalJson({
    v: 1,
    assetId,
    seq: e.seq,
    type: e.type,
    at: e.at,
    data: e.data,
    prevHash: e.prevHash,
  });

export const toChainEvent = (e: Event): ChainEvent => ({
  seq: e.seq,
  type: e.type,
  at: e.at.toISOString(),
  data: e.data as Record<string, string>,
  prevHash: e.prevHash,
  hash: e.hash,
  kid: e.kid,
  signature: e.signature,
});

/**
 * Recalcule tout à partir des seules données signées et des clés publiques.
 * Renvoie le premier problème, ou l'état que la chaîne établit (propriétaire, vol).
 */
export function checkChain(
  assetId: string,
  passport: string,
  events: ChainEvent[],
  keys: Keys,
):
  | { problem: 'passport' | 'chain'; seq?: number }
  | {
      problem: null;
      payload: PassportPayload;
      owner: string;
      stolen: boolean;
    } {
  const jws = decodeJws<PassportPayload>(passport);
  const passportKey = jws && keys.get(jws.header.kid);
  if (
    !jws ||
    !passportKey ||
    jws.header.alg !== 'ES256' ||
    !verifySignature(jws.signingInput, jws.signature, passportKey.key) ||
    passportKey.issuer !== jws.payload.issuer.id ||
    signedAfterRevocation(passportKey, jws.payload.validFrom) ||
    jws.payload.credentialSubject.id !== assetId
  ) {
    return { problem: 'passport' };
  }

  let prevHash: string | null = null;
  let owner = '';
  let stolen = false;
  for (const [i, e] of events.entries()) {
    const bytes = eventBytes(assetId, e);
    const key = keys.get(e.kid);
    const signer = SIGNED_BY_PLATFORM.has(e.type)
      ? PLATFORM
      : jws.payload.issuer.id;
    if (
      e.seq !== i ||
      e.prevHash !== prevHash ||
      (i === 0) !== (e.type === 'MINT') ||
      sha256(bytes) !== e.hash ||
      key?.issuer !== signer ||
      signedAfterRevocation(key, e.at) ||
      !verifySignature(bytes, e.signature, key.key)
    ) {
      return { problem: 'chain', seq: e.seq };
    }
    if (e.type === 'MINT') {
      if (e.data.passport !== sha256(passport)) return { problem: 'passport' };
      owner = e.data.owner;
    }
    if (e.type === 'TRANSFER') owner = e.data.to;
    if (e.type === 'STOLEN_REPORTED') stolen = true;
    if (e.type === 'RECOVERED') stolen = false;
    prevHash = e.hash;
  }
  if (events.length === 0) return { problem: 'chain', seq: 0 };
  return { problem: null, payload: jws.payload, owner, stolen };
}

@Injectable()
export class RegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly issuers: IssuerService,
    private readonly anchors: AnchorService,
  ) {}

  /** Pseudonyme d'un compte sur une pièce : stable sur cette pièce, sans lien d'une pièce à l'autre. */
  actorRef(assetId: string, userId: string): string {
    return createHmac('sha256', this.crypto.derive('actor-ref'))
      .update(`${assetId}:${userId}`)
      .digest('base64url');
  }

  /**
   * Ajoute un maillon dans la transaction de l'appelant, avec le changement d'état qu'il décrit.
   * Deux écritures concurrentes visent le même `seq` : `UNIQUE (assetId, seq)` en refuse une (409).
   */
  async append(
    tx: Prisma.TransactionClient,
    asset: Pick<Asset, 'id' | 'issuerId'>,
    type: EventType,
    data: Record<string, string>,
    at = new Date(),
  ) {
    const last = await tx.event.findFirst({
      where: { assetId: asset.id },
      orderBy: { seq: 'desc' },
    });
    const signer = SIGNED_BY_PLATFORM.has(type)
      ? { kid: this.crypto.platformKid, key: this.crypto.platformKey }
      : await this.issuers.signingKey(asset.issuerId);
    const event = {
      seq: last ? last.seq + 1 : 0,
      type,
      at: at.toISOString(),
      data,
      prevHash: last?.hash ?? null,
    };
    const bytes = eventBytes(asset.id, event);
    try {
      return await tx.event.create({
        data: {
          ...event,
          assetId: asset.id,
          at,
          hash: sha256(bytes),
          kid: signer.kid,
          signature: sign(bytes, signer.key),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'La montre a changé entre-temps : rechargez la page et réessayez.',
        );
      }
      throw error;
    }
  }

  /** Passeport, chaîne et ancrages : exactement l'entrée du vérificateur indépendant. */
  async export(asset: Pick<Asset, 'id' | 'passport'>) {
    const events = await this.prisma.event.findMany({
      where: { assetId: asset.id },
      orderBy: { seq: 'asc' },
    });
    return {
      passport: asset.passport,
      events: events.map(toChainEvent),
      anchors: await this.anchors.proofs(asset.id),
    };
  }

  /**
   * Vérification complète : passeport, chaîne, puis cohérence de la base avec la chaîne.
   * Le propriétaire et le statut en base ne sont que des copies : ils doivent concorder.
   */
  async verify(asset: Asset) {
    const { events, anchors } = await this.export(asset);
    const result = checkChain(
      asset.id,
      asset.passport,
      events,
      await this.issuers.publicKeys(),
    );
    if (result.problem) return { problem: result.problem as Problem, events };
    if (
      result.owner !== this.actorRef(asset.id, asset.ownerId) ||
      result.stolen !== (asset.status === 'STOLEN')
    ) {
      return { problem: 'registry' as Problem, events };
    }
    return {
      problem: null,
      events,
      anchors,
      payload: result.payload,
      stolen: result.stolen,
    };
  }
}
