import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { readEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

/** Un ancrage tel qu'exporté : de quoi prouver sans Certis qu'une tête de chaîne existait à une date. */
export type ProofAnchor = {
  seq: number;
  hash: string;
  root: string;
  path: ['L' | 'R', string][];
  token: string;
};

// ── Arbre de Merkle. Préfixes 0x00 / 0x01 (RFC 6962) : une feuille ne peut pas passer pour un nœud.
const digest = (...parts: Buffer[]) =>
  createHash('sha256').update(Buffer.concat(parts)).digest();
const leaf = (hash: string) =>
  digest(Buffer.from([0]), Buffer.from(hash, 'base64url'));
const node = (left: Buffer, right: Buffer) =>
  digest(Buffer.from([1]), left, right);

/** Racine de l'arbre et chemin d'audit de la feuille `index`. Un nœud sans voisin monte tel quel. */
export function merkle(hashes: string[], index = 0) {
  let level: Buffer[] = hashes.map(leaf);
  const path: ProofAnchor['path'] = [];
  for (let i = index; level.length > 1; i = Math.floor(i / 2)) {
    const sibling = i % 2 ? i - 1 : i + 1;
    if (sibling < level.length) {
      path.push([i % 2 ? 'L' : 'R', level[sibling].toString('base64url')]);
    }
    const next: Buffer[] = [];
    for (let j = 0; j < level.length; j += 2) {
      next.push(j + 1 < level.length ? node(level[j], level[j + 1]) : level[j]);
    }
    level = next;
  }
  return { root: level[0], path };
}

// ── RFC 3161 : juste ce qu'il faut pour demander un jeton et en lire la date.
type Der = { tag: number; body: Buffer; raw: Buffer };

/** Les éléments DER successifs de `buf` : tag, contenu, octets bruts. */
function der(buf: Buffer): Der[] {
  const out: Der[] = [];
  for (let i = 0; i < buf.length; ) {
    const start = i;
    const tag = buf[i++];
    let length = buf[i++];
    if (length & 0x80) {
      const bytes = length & 0x7f;
      length = 0;
      for (let k = 0; k < bytes; k++) length = length * 256 + buf[i++];
    }
    out.push({
      tag,
      body: buf.subarray(i, i + length),
      raw: buf.subarray(start, i + length),
    });
    i += length;
  }
  return out;
}

/** Empreinte horodatée et date (genTime) d'un TimeStampToken : CMS SignedData → TSTInfo. */
function tstInfo(token: Buffer) {
  const signedData = der(der(der(der(token)[0].body)[1].body)[0].body);
  const eContent = der(der(der(signedData[2].body)[1].body)[0].body)[0];
  const [, , imprint, , genTime] = der(eContent.body);
  return {
    imprint: der(imprint.body)[1].body,
    // AAAAMMJJHHMMSS[.fff]Z
    at: new Date(
      genTime.body
        .toString()
        .replace(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/, '$1-$2-$3T$4:$5:$6'),
    ),
  };
}

// TimeStampReq (RFC 3161, § 2.4.1) : version 1, empreinte SHA-256 de 32 octets, certificat de l'autorité joint.
const REQUEST = Buffer.from(
  '30390201013031300d060960864801650304020105000420',
  'hex',
);
const WITH_CERT = Buffer.from('0101ff', 'hex');

async function timestamp(url: string, root: Buffer) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/timestamp-query' },
    body: new Uint8Array(Buffer.concat([REQUEST, root, WITH_CERT])),
    signal: AbortSignal.timeout(15_000),
  });
  const [response] = der(Buffer.from(await res.arrayBuffer()));
  const [status, token] = response ? der(response.body) : [];
  // PKIStatus : 0 accordé, 1 accordé avec modifications, au-delà refusé.
  if (!res.ok || !token || der(status.body)[0].body[0] > 1) {
    throw new Error(`l'autorité a refusé (HTTP ${res.status})`);
  }
  const info = tstInfo(token.raw);
  if (!info.imprint.equals(root) || Number.isNaN(info.at.getTime())) {
    throw new Error("le jeton ne porte pas l'empreinte demandée");
  }
  return { token: token.raw.toString('base64'), at: info.at };
}

// Toutes les 10 min s'il y a du nouveau : sous les 15 min après lesquelles Render endort l'instance (ADR-0008).
const EVERY_MS = 10 * 60_000;

/**
 * Ancrage externe (S-04, ADR-0007). Les têtes de chaîne nouvelles forment un arbre de Merkle ;
 * seule sa racine part chez l'autorité, qui n'apprend rien des pièces.
 */
@Injectable()
export class AnchorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnchorService.name);
  private readonly tsaUrl = readEnv().tsaUrl;
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!this.tsaUrl) return;
    this.timer = setInterval(() => {
      this.anchor().catch((error: Error) =>
        this.logger.warn(`Ancrage reporté : ${error.message}`),
      );
    }, EVERY_MS).unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** Horodate les têtes de chaîne qui ne l'ont pas encore été ; `null` s'il n'y en a pas. */
  async anchor() {
    if (!this.tsaUrl) throw new Error('ancrage désactivé : TSA_URL est vide');
    // ponytail: un seul arbre pour toutes les têtes nouvelles ; à grande échelle, un journal Merkle incrémental (RFC 9162).
    const heads = await this.prisma.$queryRaw<
      { assetId: string; seq: number; hash: string }[]
    >`
      SELECT h.* FROM (
        SELECT DISTINCT ON ("assetId") "assetId", "seq", "hash"
        FROM "Event" ORDER BY "assetId", "seq" DESC
      ) h
      WHERE NOT EXISTS (
        SELECT 1 FROM "AnchorLeaf" l WHERE l."assetId" = h."assetId" AND l."seq" = h."seq"
      )
      ORDER BY h."assetId"`;
    if (heads.length === 0) return null;
    const { root } = merkle(heads.map((h) => h.hash));
    const { token, at } = await timestamp(this.tsaUrl, root);
    return this.prisma.anchor.create({
      data: {
        root: root.toString('base64url'),
        token,
        at,
        leaves: { create: heads.map((head, index) => ({ ...head, index })) },
      },
      include: { leaves: true },
    });
  }

  /** Les ancrages d'une pièce, du plus ancien au plus récent, chacun avec son chemin d'audit. */
  async proofs(assetId: string): Promise<ProofAnchor[]> {
    const leaves = await this.prisma.anchorLeaf.findMany({
      where: { assetId },
      orderBy: { seq: 'asc' },
      include: {
        anchor: { include: { leaves: { orderBy: { index: 'asc' } } } },
      },
    });
    return leaves.map(({ seq, hash, index, anchor }) => ({
      seq,
      hash,
      root: anchor.root,
      path: merkle(
        anchor.leaves.map((l) => l.hash),
        index,
      ).path,
      token: anchor.token,
    }));
  }
}
