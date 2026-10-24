import { Easing, Platform } from 'react-native';

// Direction « Registre », version 6 (docs/adr/0009-direction-visuelle-registre-v6.md).
// L'or ne s'utilise jamais comme texte sur le papier (contraste 2,0:1).
export const color = {
    paper: '#F4F1EA',
    card: '#FBF9F4',
    hover: '#EDE8DC',
    hairline: '#D9D3C5',
    ink: '#14161C',
    slate: '#5B5E66',
    seal: '#14275C',
    deep: '#0E1C45',
    night: '#0B1430',
    gold: '#C9A66B',
    mist: '#AEB8D6',
    verified: '#17603F',
    refused: '#A3172A',
    white: '#FFFFFF',
};

export const font = {
    wide: 'Unbounded_300Light',
    wideMedium: 'Unbounded_500Medium',
    serif: 'InstrumentSerif_400Regular',
    serifItalic: 'InstrumentSerif_400Regular_Italic',
    body: 'Geist_400Regular',
    bodyMedium: 'Geist_500Medium',
    bodySemi: 'Geist_600SemiBold',
    mono: 'GeistMono_400Regular',
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 72 };

export const breakpoint = { medium: 600, wide: 1024 };
export const maxContent = 1240;

export const motion = {
    ease: Easing.bezier(0.2, 0.7, 0.2, 1),
    stamp: Easing.bezier(0.2, 0.9, 0.3, 1.25),
    // Le pilote natif n'existe pas sur web : Animated y retombe sur JS, sans avertissement.
    native: Platform.OS !== 'web',
};

// Ancienne palette, retirée quand tous les écrans seront passés en V6.
export const palette = {
  porscheGreen: '#3AA06F',
  porscheGreenSoft: '#143726',
  primaryGold: '#5FCF97',
  primaryGoldSoft: '#DDF3E8',
  background: '#050806',
  surface: '#0D1410',
  surfaceElevated: '#111B15',
  border: '#2A4437',
  white: '#FFFFFF',
  success: '#5FCF97',
  successSoft: '#123724',
  warning: '#FFB74D',
  danger: '#FF6B6B',
  dangerSoft: '#3A1111',
  neutralText: '#B9C8BF',
  textStrong: '#F2F7F3',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};
