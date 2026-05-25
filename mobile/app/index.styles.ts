import { StyleSheet } from 'react-native';
import { palette, spacing } from '../theme/tokens';
import { sharedStyles } from './shared.styles';

export const styles = StyleSheet.create({
  container: sharedStyles.screenContainer,
  centered: sharedStyles.centered,
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { ...sharedStyles.screenTitle, marginBottom: 0 },
  addButton: { marginBottom: spacing.md },
  card: { marginBottom: spacing.md, borderRadius: spacing.md, backgroundColor: palette.white },
  watchImage: { height: 190, borderTopLeftRadius: spacing.md, borderTopRightRadius: spacing.md },
  status: { marginTop: spacing.sm / 2, color: palette.neutralText },
});

