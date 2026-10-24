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
    switch (type) {
        case 'MINT':
            return { label: 'Inscription au registre', note: issuer ? `par ${issuer}` : 'par son émetteur' };
        case 'TRANSFER':
            return you
                ? { label: 'Reçue par vous', note: 'cession acceptée' }
                : { label: 'Changement de propriétaire', note: 'accepté par le nouveau propriétaire' };
        case 'SERVICE':
            return { label: 'Révision', note: note ?? '' };
        case 'STOLEN_REPORTED':
            return { label: 'Déclarée volée', note: 'par son propriétaire' };
        case 'RECOVERED':
            return { label: 'Déclarée retrouvée', note: 'par son propriétaire' };
    }
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
