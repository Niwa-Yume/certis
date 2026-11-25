import { Easing, Platform } from 'react-native';

// Identité visuelle (docs/adr/0014-tokens-maison-et-theme-sombre.md). Une base neutre chaude, une encre
// presque noire, un seul accent métal. Le vert ne dit que « vérifié », le rouge que « déclarée volée ».
// Le métal ne s'écrit jamais sur le fond clair (contraste 2,4:1) : seulement sur `deep`.
// Chaque jeu existe de jour et de nuit, avec la même hiérarchie ; tous les couples texte/fond passent 4,5:1.
const neutralLight = {
    paper: '#F4F1EA', // fond de page
    card: '#FBF9F4', // surface posée sur le fond
    hover: '#EDE8DC',
    hairline: '#D9D3C5',
    ink: '#1A1814', // texte
    slate: '#5E5A52', // texte secondaire
    deep: '#1F1C18', // surface sombre : vitrine de la pièce, bouton principal
    onDeep: '#F4F1EA', // texte sur `deep`
    mist: '#B8B0A2', // texte secondaire sur `deep`
    metal: '#B89B6A', // l'accent, sur `deep` uniquement
    verified: '#17603F',
    refused: '#A3172A',
    onSignal: '#FFFFFF', // texte sur `verified` ou `refused`
};
type Palette = typeof neutralLight;

const neutralDark: Palette = {
    paper: '#121110',
    card: '#1A1917',
    hover: '#24221F',
    hairline: '#34312C',
    ink: '#EEEAE2',
    slate: '#A39D92',
    deep: '#2A2622', // un cran au-dessus du fond : la vitrine reste une vitrine, de nuit
    onDeep: '#F4F1EA',
    mist: '#B8B0A2',
    metal: '#C9AE7E',
    verified: '#6FCF97',
    refused: '#FF8A8A',
    onSignal: '#121110',
};

// La maison fictive de la démo : seuls la vitrine et le métal changent, les composants non.
const palettes = {
    neutral: { light: neutralLight, dark: neutralDark },
    house: {
        light: { ...neutralLight, deep: '#18231E', metal: '#C2A56A' },
        dark: { ...neutralDark, deep: '#1F2C26', metal: '#CDB27C' },
    },
};

/** Version aux couleurs d'une maison (défaut) ou version neutre Certis, choisie au build. */
export const theme = process.env.EXPO_PUBLIC_THEME === 'neutral' ? 'neutral' : 'house';
export const palette = palettes[theme];

// Web : des variables CSS, pour que le thème sombre suive le système sans re-rendu.
// shortcut: le natif reste en clair ; à brancher sur useColorScheme si une app native est publiée.
export const color: Palette =
    Platform.OS === 'web'
        ? (Object.fromEntries(Object.keys(neutralLight).map((k) => [k, `var(--${k})`])) as Palette)
        : palette.light;

const vars = (p: Palette) => Object.entries(p).map(([k, v]) => `--${k}:${v};`).join('');
export const cssVariables = `:root{color-scheme:light dark;${vars(palette.light)}}@media (prefers-color-scheme:dark){:root{${vars(palette.dark)}}}@media print{:root{${vars(palette.light)}}}`;

// Deux familles : un serif à fort contraste pour les titres, une linéale pour l'interface.
// Geist Mono, de la même famille, ne sert qu'aux identifiants du volet Preuves.
export const font = {
    serif: 'InstrumentSerif_400Regular',
    serifItalic: 'InstrumentSerif_400Regular_Italic',
    body: 'Geist_400Regular',
    bodyMedium: 'Geist_500Medium',
    bodySemi: 'Geist_600SemiBold',
    mono: 'GeistMono_400Regular',
};

// Au plus quatre tailles par écran : un titre (display ou title), le texte, la légende.
export const typeScale = { display: 48, title: 32, body: 16, caption: 13 };

// Grille de 8 px ; marges de 24 px sur mobile, 64 px sur ordinateur.
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 };

export const breakpoint = { medium: 600, wide: 1024 };
export const maxContent = 1240;

export const motion = {
    // Transitions de 200 à 400 ms, en ease-out ; rien en boucle.
    fast: 200,
    slow: 400,
    ease: Easing.out(Easing.cubic),
    // Le pilote natif n'existe pas sur web : Animated y retombe sur JS, sans avertissement.
    native: Platform.OS !== 'web',
};
