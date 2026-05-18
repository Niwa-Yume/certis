import { StyleSheet } from 'react-native';
import { palette, spacing } from '../theme/tokens';

export const sharedStyles = StyleSheet.create({
  screenContainer: { flex: 1, padding: spacing.md, backgroundColor: palette.surface, paddingTop: 60 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { marginBottom: spacing.md, fontWeight: '700' },
});

