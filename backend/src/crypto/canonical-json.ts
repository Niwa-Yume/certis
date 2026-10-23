// RFC 8785 (JCS) : mêmes données ⇒ mêmes octets, quel que soit le langage du vérificateur.
// Clés triées par unités UTF-16 ; chaînes et nombres sérialisés comme JSON.stringify (ECMAScript).
// Pas de normalisation Unicode (hors JCS) : les entrées sont normalisées NFC à la validation.
export function canonicalJson(value: unknown): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('JCS : nombre non fini');
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const entries = Object.entries(value)
    .filter(([, field]) => field !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([key, field]) => `${JSON.stringify(key)}:${canonicalJson(field)}`)
    .join(',')}}`;
}
