import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import { palette } from './tokens';

export const appTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 16,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.primaryGold,
    onPrimary: '#0C1D15',
    primaryContainer: '#1C5A3E',
    onPrimaryContainer: '#DDF3E8',
    secondary: '#73D5A3',
    onSecondary: palette.white,
    secondaryContainer: '#1A4532',
    onSecondaryContainer: '#DDF3E8',
    tertiary: '#5FCF97',
    onTertiary: palette.white,
    tertiaryContainer: '#1A4532',
    onTertiaryContainer: '#DDF3E8',
    background: palette.background,
    surface: palette.surface,
    onSurface: palette.textStrong,
    onSurfaceVariant: palette.neutralText,
    surfaceVariant: '#16261D',
    outline: palette.border,
    outlineVariant: '#22392D',
    inversePrimary: '#A5D6BC',
    error: palette.danger,
    onError: '#2A0B0B',
    errorContainer: palette.dangerSoft,
    onErrorContainer: '#FFDADA',
  },
};
