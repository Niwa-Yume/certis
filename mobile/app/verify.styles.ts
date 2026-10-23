import { StyleSheet } from 'react-native';
import { palette, spacing } from '../theme/tokens';

export const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: { marginTop: spacing.md, marginBottom: spacing.lg },
  result: { fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: palette.neutralText },
  loadingText: { marginTop: spacing.md, color: palette.neutralText },
});
