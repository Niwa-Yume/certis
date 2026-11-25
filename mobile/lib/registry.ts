import { tr } from './i18n';

// Vocabulaire du registre (ADR-0006), partagé par la fiche du propriétaire et le rapport public.

export type EventType = 'MINT' | 'TRANSFER' | 'SERVICE' | 'STOLEN_REPORTED' | 'RECOVERED';

export type Specs = Record<'movement' | 'case' | 'dial' | 'bracelet', string | null>;

export const SPEC_LABELS: [keyof Specs, string][] = [
    ['movement', 'Mouvement'],
    ['case', 'Boîtier'],
    ['dial', 'Cadran'],
    ['bracelet', 'Bracelet'],
];

/** Libellé et précision d'un maillon. `you` : le lecteur est celui qui a reçu la pièce. */
export function describeEvent(type: EventType, { issuer, note, you }: { issuer?: string; note?: string; you?: boolean } = {}) {
    if (type === 'MINT') return { label: tr.event.MINT, note: issuer ?? '' };
    if (type === 'TRANSFER' && you) return { label: tr.event.received, note: '' };
    return { label: tr.event[type], note: type === 'SERVICE' ? note ?? '' : '' };
}

/** Fichier de preuve pour le vérificateur indépendant (tools/verify) : téléchargement côté web. */
export function downloadJson(name: string, data: unknown) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}
