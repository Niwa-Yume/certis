// N° d'inscription lisible, dérivé de l'identifiant : CRT·7F3A·21C9.
export function registryNumber(id: string): string {
    const hex = id.replace(/-/g, '').toUpperCase();
    return `CRT·${hex.slice(0, 4)}·${hex.slice(4, 8)}`;
}

// « Carrera Calibre S » → ['Carrera', 'Calibre S'] : le second membre passe en italique.
export function splitName(name: string): [string, string] {
    const i = name.indexOf(' ');
    return i < 0 ? [name, ''] : [name.slice(0, i), name.slice(i + 1)];
}

const date = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleDateString('fr-FR', options);

/** 12.03.2026 */
export const shortDate = (iso: string) =>
    date(iso, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');

/** 12 mars 2026 */
export const longDate = (iso: string) => date(iso, { day: 'numeric', month: 'long', year: 'numeric' });

/** 12 MARS 2026 */
export const capsDate = (iso: string) =>
    date(iso, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

/** 10 h 42 */
export function clock(iso: string): string {
    const d = new Date(iso);
    return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
}
