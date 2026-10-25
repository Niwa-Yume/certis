#!/usr/bin/env node
// Vérificateur indépendant d'un passeport Certis et de sa chaîne d'événements.
// Sans Certis, sans dépendance : Node 20 ou plus et la JWKS publique suffisent.
// Il réimplémente volontairement la vérification du serveur (ADR-0004, ADR-0006) : une seconde
// implémentation, lisible d'un bout à l'autre, est précisément ce qui permet de ne pas faire confiance au serveur.
//
// Usage : node verify.mjs <export.json> <jwks.json | URL de la JWKS> [preuve antérieure.json …]
// Les preuves antérieures, gardées par l'acheteur ou un expert, apportent leurs ancrages : la chaîne doit les contenir.
// Autorités d'horodatage de confiance : tsa-ca.pem (FreeTSA), ou les racines du fichier désigné par CERTIS_TSA_CA.
import { X509Certificate, createHash, createPublicKey, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [exportPath, jwksSource, ...earlierPaths] = process.argv.slice(2);
if (!exportPath || !jwksSource) {
  console.error('Usage : node verify.mjs <export.json> <jwks.json | URL de la JWKS> [preuve antérieure.json …]');
  process.exit(2);
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const { passport, events, anchors = [] } = await readJson(exportPath);
const earlier = (await Promise.all(earlierPaths.map(readJson))).flatMap((proof) => proof.anchors ?? []);
const jwks = /^https?:\/\//.test(jwksSource)
  ? await (await fetch(jwksSource)).json()
  : await readJson(jwksSource);
const roots = (await readFile(process.env.CERTIS_TSA_CA ?? new URL('./tsa-ca.pem', import.meta.url), 'utf8'))
  .match(/-----BEGIN CERTIFICATE-----[^-]+-----END CERTIFICATE-----/g)
  .map((pem) => new X509Certificate(pem));

// JSON canonique (RFC 8785) : clés triées par unités UTF-16, valeurs sérialisées comme JSON.stringify.
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, field]) => field !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, field]) => `${JSON.stringify(key)}:${canonical(field)}`).join(',')}}`;
}

const sha256 = (text) => createHash('sha256').update(text).digest('base64url');
const fromB64 = (part) => JSON.parse(Buffer.from(part, 'base64url').toString());
// ES256 au format JOSE : r‖s sur 64 octets.
const signed = (bytes, signature, key) =>
  verify('sha256', Buffer.from(bytes), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'));
const fail = (message, label = 'ALTÉRATION') => {
  console.log(`${label} : ${message}`);
  process.exit(1);
};

const keys = new Map(
  jwks.keys.map(({ kid, issuer, revokedAt, kty, crv, x, y }) => [
    kid,
    { issuer, revokedAt, key: createPublicKey({ key: { kty, crv, x, y }, format: 'jwk' }) },
  ]),
);

// 0. Les ancrages (ADR-0007) : un jeton RFC 3161 atteste qu'à sa date, une racine de Merkle existait ;
// le chemin d'audit relie cette racine à une tête de chaîne, qui couvre tous les maillons précédents.

/** Les éléments DER successifs de `buf` : tag, contenu, octets bruts. */
function der(buf) {
  const out = [];
  for (let i = 0; i < buf.length; ) {
    const start = i;
    const tag = buf[i++];
    let length = buf[i++];
    if (length & 0x80) {
      const bytes = length & 0x7f;
      length = 0;
      for (let k = 0; k < bytes; k++) length = length * 256 + buf[i++];
    }
    out.push({ tag, body: buf.subarray(i, i + length), raw: buf.subarray(start, i + length) });
    i += length;
  }
  return out;
}

const HASHES = { '608648016503040201': 'sha256', '608648016503040202': 'sha384', '608648016503040203': 'sha512' };
const MESSAGE_DIGEST = '2a864886f70d010904';
const TIME_STAMPING = '1.3.6.1.5.5.7.3.8';
const within = (cert, at) => Date.parse(cert.validFrom) <= at && at <= Date.parse(cert.validTo);
const issued = (child, parent) => child.checkIssued(parent) && child.verify(parent.publicKey);

/** Du certificat de l'autorité jusqu'à une racine de confiance, par les intermédiaires joints au jeton. */
function chainsToRoot(cert, pool, at) {
  for (let depth = 0; depth < 4; depth++) {
    if (roots.some((root) => within(root, at) && issued(cert, root))) return true;
    const parent = pool.find((c) => c !== cert && c.ca && within(c, at) && issued(cert, c));
    if (!parent) return false;
    cert = parent;
  }
  return false;
}

/**
 * Jeton d'horodatage (CMS SignedData, RFC 5652 et RFC 3161) : l'empreinte et la date qu'il atteste,
 * ou `null` s'il est mal formé, mal signé, ou signé par une autorité qui ne mène à aucune racine de confiance.
 */
function stampOf(base64) {
  try {
    const signedData = der(der(der(der(Buffer.from(base64, 'base64'))[0].body)[1].body)[0].body);
    // eContent : un OCTET STRING qui contient le TSTInfo encodé, celui dont l'empreinte est signée.
    const tstInfo = der(der(signedData[2].body)[1].body)[0].body;
    const [, , imprint, , genTime] = der(der(tstInfo)[0].body);
    const certs = signedData[3].tag === 0xa0 ? der(signedData[3].body).map((c) => new X509Certificate(c.raw)) : [];
    const [, , digestAlg, attrs, , signature] = der(der(signedData.at(-1).body)[0].body);
    const hash = HASHES[der(digestAlg.body)[0].body.toString('hex')];
    if (!hash || attrs.tag !== 0xa0) return null;
    // L'autorité signe ses attributs (réencodés en SET), dont l'empreinte du TSTInfo.
    const digest = der(attrs.body)
      .map((attr) => der(attr.body))
      .find(([type]) => type.body.toString('hex') === MESSAGE_DIGEST)?.[1];
    if (!digest || !der(digest.body)[0].body.equals(createHash(hash).update(tstInfo).digest())) return null;
    const signedAttrs = Buffer.from(attrs.raw);
    signedAttrs[0] = 0x31;
    const at = Date.parse(genTime.body.toString().replace(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/, '$1-$2-$3T$4:$5:$6'));
    const signer = certs.find(
      (c) => (c.extKeyUsage ?? c.keyUsage)?.includes(TIME_STAMPING) && verify(hash, signedAttrs, c.publicKey, signature.body),
    );
    if (!signer || !within(signer, at) || !chainsToRoot(signer, certs, at)) return null;
    return { imprint: der(imprint.body)[1].body, at, tsa: signer.subject.match(/CN=([^\n]+)/)?.[1] ?? signer.subject };
  } catch {
    return null;
  }
}

const sha256Bytes = (...parts) => createHash('sha256').update(Buffer.concat(parts)).digest();
// Préfixes 0x00 / 0x01 (RFC 6962) : une feuille ne peut pas passer pour un nœud.
const rootOf = (hash, path) =>
  path.reduce(
    (node, [side, sibling]) =>
      side === 'L'
        ? sha256Bytes(Buffer.from([1]), Buffer.from(sibling, 'base64url'), node)
        : sha256Bytes(Buffer.from([1]), node, Buffer.from(sibling, 'base64url')),
    sha256Bytes(Buffer.from([0]), Buffer.from(hash, 'base64url')),
  );

function checkAnchor(anchor) {
  const where = `ancrage du maillon seq ${anchor.seq}`;
  const stamp = stampOf(anchor.token);
  if (!stamp) fail(`${where} — jeton d'horodatage invalide, ou d'une autorité non reconnue (CERTIS_TSA_CA pour en ajouter une)`);
  let root;
  try {
    root = rootOf(anchor.hash, anchor.path);
  } catch {
    fail(`${where} — chemin d'audit illisible`);
  }
  if (!root.equals(stamp.imprint) || root.toString('base64url') !== anchor.root) {
    fail(`${where} — le chemin d'audit ne mène pas à la racine horodatée`);
  }
  if (events[anchor.seq]?.hash !== anchor.hash) {
    fail(`événement seq ${anchor.seq} — diffère du maillon ancré le ${new Date(stamp.at).toISOString()} : chaîne réécrite`);
  }
  return { seq: anchor.seq, at: stamp.at, tsa: stamp.tsa };
}

const stamps = anchors.map(checkAnchor);
const earlierStamps = earlier.map(checkAnchor);
// Date à laquelle le maillon `seq` est prouvé exister au plus tard (Infinity : jamais ancré).
const provenAt = (seq) => Math.min(...[...stamps, ...earlierStamps].filter((s) => s.seq >= seq).map((s) => s.at));

// Une clé révoquée (ADR-0011) ne vaut que pour ce qu'elle a signé avant sa date de révocation. Hors du registre,
// cette date est déclarée par le signataire, qui pourrait antidater : il faut qu'un ancrage la prouve (ADR-0007).
function revokedFor(key, date, seq) {
  if (key.revokedAt === undefined) return null;
  const revokedAt = Date.parse(key.revokedAt);
  if (!(Date.parse(date) < revokedAt)) return `signé par une clé révoquée depuis le ${key.revokedAt}`;
  if (!(provenAt(seq) < revokedAt)) return `signé par une clé révoquée depuis le ${key.revokedAt}, sans ancrage antérieur à cette date`;
  return null;
}

// 1. Le passeport : signé par une clé publiée, qui appartient à l'émetteur qu'il désigne.
const [h, p, s] = passport.split('.');
const header = fromB64(h);
const payload = fromB64(p);
const passportKey = keys.get(header.kid);
if (header.alg !== 'ES256' || !passportKey || !signed(`${h}.${p}`, s, passportKey.key)) {
  fail('passeport — signature invalide, ou clé absente de la JWKS');
}
if (passportKey.issuer !== payload.issuer.id) {
  fail("passeport — signé par une clé qui n'appartient pas à son émetteur");
}
const passportRevoked = revokedFor(passportKey, payload.validFrom, 0);
if (passportRevoked) fail(`passeport — ${passportRevoked}`, 'CLÉ RÉVOQUÉE');
const assetId = payload.credentialSubject.id;

// 2. La chaîne : chaque maillon pointe sur le précédent, se hache à l'identique et porte la bonne signature.
// La plateforme signe ce qu'elle constate, l'émetteur ce qu'il atteste (ADR-0003).
const SIGNED_BY_PLATFORM = new Set(['TRANSFER', 'STOLEN_REPORTED', 'RECOVERED']);
let prevHash = null;
let stolen = false;
for (const [i, e] of events.entries()) {
  const where = `événement seq ${e.seq} (${e.type})`;
  if (e.seq !== i) fail(`${where} — numérotation rompue, ${i} attendu`);
  if (e.prevHash !== prevHash) fail(`${where} — ne pointe pas sur le maillon précédent`);
  if ((i === 0) !== (e.type === 'MINT')) fail(`${where} — la chaîne commence par une inscription, et une seule`);
  const bytes = canonical({ v: 1, assetId, seq: e.seq, type: e.type, at: e.at, data: e.data, prevHash: e.prevHash });
  if (sha256(bytes) !== e.hash) fail(`${where} — le hash recalculé diffère du hash enregistré : contenu modifié`);
  const key = keys.get(e.kid);
  const expected = SIGNED_BY_PLATFORM.has(e.type) ? 'certis' : payload.issuer.id;
  if (!key || key.issuer !== expected) fail(`${where} — signé par une clé qui n'a pas le droit de signer ce type`);
  const revoked = revokedFor(key, e.at, e.seq);
  if (revoked) fail(`${where} — ${revoked}`, 'CLÉ RÉVOQUÉE');
  if (!signed(bytes, e.signature, key.key)) fail(`${where} — signature invalide`);
  if (e.type === 'MINT' && e.data.passport !== sha256(passport)) fail(`${where} — l'inscription ne porte pas ce passeport`);
  if (e.type === 'STOLEN_REPORTED') stolen = true;
  if (e.type === 'RECOVERED') stolen = false;
  prevHash = e.hash;
}
if (events.length === 0) fail('chaîne vide');

const subject = payload.credentialSubject;
console.log(`OK : ${subject.brand} ${subject.name} (${subject.reference}), émise par ${payload.issuer.name}.`);
console.log(`     ${events.length} événement(s) chaînés et signés : ${events.map((e) => e.type).join(' → ')}.`);
if (stolen) console.log('     ATTENTION : la pièce est déclarée volée.');
const links = (from, to) => (from === to ? `maillon ${from}` : `maillons ${from} à ${to}`);
for (const s of stamps) {
  console.log(`     Ancrée : ${links(0, s.seq)} attestés au plus tard le ${new Date(s.at).toISOString()} (horodatage RFC 3161, ${s.tsa}).`);
}
const anchored = Math.max(-1, ...stamps.map((s) => s.seq));
if (anchored < events.length - 1) {
  console.log(`     Pas encore ancrée : ${links(anchored + 1, events.length - 1)} (l'ancrage passe toutes les 10 minutes).`);
}
if (earlierStamps.length) console.log(`     Concorde avec ${earlierStamps.length} ancrage(s) des preuves antérieures.`);
console.log(`     Tête de chaîne : ${prevHash}`);
console.log('     Gardez ce fichier : redonné à une vérification future, après la JWKS, ses ancrages trahiront toute réécriture.');
