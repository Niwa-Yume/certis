#!/usr/bin/env node
// Vérificateur indépendant d'un passeport Certis et de sa chaîne d'événements.
// Sans Certis, sans dépendance : Node 20 ou plus et la JWKS publique suffisent.
// Il réimplémente volontairement la vérification du serveur (ADR-0004, ADR-0006) : une seconde
// implémentation, lisible d'un bout à l'autre, est précisément ce qui permet de ne pas faire confiance au serveur.
//
// Usage : node verify.mjs <export.json> <jwks.json | URL de la JWKS>
import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [exportPath, jwksSource] = process.argv.slice(2);
if (!exportPath || !jwksSource) {
  console.error('Usage : node verify.mjs <export.json> <jwks.json | URL de la JWKS>');
  process.exit(2);
}

const { passport, events } = JSON.parse(await readFile(exportPath, 'utf8'));
const jwks = /^https?:\/\//.test(jwksSource)
  ? await (await fetch(jwksSource)).json()
  : JSON.parse(await readFile(jwksSource, 'utf8'));

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

// Une clé révoquée (ADR-0011) ne vaut que pour ce qu'elle a signé avant sa date de révocation.
// La date est celle que déclare le signataire : seul un ancrage horodaté empêcherait de l'antidater.
const revokedFor = (key, date) => key.revokedAt !== undefined && !(Date.parse(date) < Date.parse(key.revokedAt));

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
if (revokedFor(passportKey, payload.validFrom)) {
  fail(`passeport — signé par une clé révoquée depuis le ${passportKey.revokedAt}`, 'CLÉ RÉVOQUÉE');
}
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
  if (revokedFor(key, e.at)) fail(`${where} — signé par une clé révoquée depuis le ${key.revokedAt}`, 'CLÉ RÉVOQUÉE');
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
console.log(`     Tête de chaîne : ${prevHash}`);
console.log('     Gardez cette valeur : toute réécriture ultérieure de la chaîne la changera.');
