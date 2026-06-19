import { StyleSheet } from 'react-native';
import { palette, spacing } from '../theme/tokens';

export const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: { fontSize: 80, marginTop: spacing.md, marginBottom: spacing.lg },
  result: { fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: palette.neutralText },
  loadingText: { marginTop: spacing.md, color: palette.neutralText },
});

export const getVerifyBackgroundColor = (valid: boolean | null) => {
  if (valid === true) return palette.successSoft;
  if (valid === false) return palette.dangerSoft;
  return palette.background;
};

export const getVerifyResultColor = (valid: boolean | null) => {
  if (valid === true) return palette.success;
  if (valid === false) return palette.danger;
  return palette.textStrong;
};

