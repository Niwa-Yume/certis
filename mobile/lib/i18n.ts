import { Platform } from 'react-native';

// Le texte de l'interface, en français et en anglais. Pas de bibliothèque : un objet par langue,
// et le type impose que l'anglais ait chaque clé du français (docs/glossaire.md pour le vocabulaire).
const fr = {
    loading: 'Chargement',
    copy: 'Copier',
    copied: 'Copié',
    retry: 'Réessayer',
    unreachable: 'Serveur injoignable : vérifiez votre connexion, puis réessayez.',
    // Les six états de chaque écran : ce qui se passe, puis quoi faire.
    state: {
        loading: { title: 'Un instant', body: 'La page se prépare.' },
        empty: { title: 'Votre collection est vide', body: 'Quand une maison vous remet une pièce, elle apparaît ici.' },
        offline: { title: 'Vous êtes hors ligne', body: 'Vérifiez votre connexion, puis réessayez.' },
        error: { title: 'Cette page ne s’affiche pas', body: 'Réessayez dans un instant. Si cela continue, contactez la maison.' },
        notFound: { title: 'Ce passeport est introuvable', body: 'Le lien a peut-être expiré. Demandez-en un nouveau au propriétaire.' },
        revoked: { title: 'Ce passeport n’est plus valable', body: 'La maison qui l’a émis a révoqué sa signature. Contactez-la avant toute cession.' },
    },
};

const en: typeof fr = {
    loading: 'Loading',
    copy: 'Copy',
    copied: 'Copied',
    retry: 'Try again',
    unreachable: 'Server unreachable: check your connection, then try again.',
    state: {
        loading: { title: 'One moment', body: 'The page is getting ready.' },
        empty: { title: 'Your collection is empty', body: 'When a house hands you a piece, it appears here.' },
        offline: { title: 'You are offline', body: 'Check your connection, then try again.' },
        error: { title: 'This page cannot be shown', body: 'Try again in a moment. If it keeps happening, contact the house.' },
        notFound: { title: 'This passport cannot be found', body: 'The link may have expired. Ask the owner for a new one.' },
        revoked: { title: 'This passport is no longer valid', body: 'The house that issued it has revoked its signature. Contact it before any change of ownership.' },
    },
};

// ?lang=en ou ?lang=fr l'emporte (utile pour la démo), sinon la langue du système ; français par défaut.
function detect(): 'fr' | 'en' {
    const param = Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('lang') : null;
    const wanted = param ?? Intl.DateTimeFormat().resolvedOptions().locale;
    return wanted.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

export const lang = detect();
export const tr = lang === 'en' ? en : fr;
/** Locale des dates et des nombres. */
export const locale = lang === 'en' ? 'en-GB' : 'fr-CH';
