import { MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { palette } from './tokens';

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.porscheGreen,
    onPrimary: palette.white,
    primaryContainer: palette.porscheGreenSoft,
    onPrimaryContainer: '#0D3D24',
    secondary: '#2B5D45',
    onSecondary: palette.white,
    secondaryContainer: '#E4EFE8',
    onSecondaryContainer: '#1E2F25',
    tertiary: '#3B7B4F',
    onTertiary: palette.white,
    tertiaryContainer: '#E0F0E1',
    onTertiaryContainer: '#183421',
    background: palette.background,
    surface: palette.surface,
    surfaceVariant: '#EEF2EF',
    outline: palette.border,
    inversePrimary: '#66C58F',
  },
};


