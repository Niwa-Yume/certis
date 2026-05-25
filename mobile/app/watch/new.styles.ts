import { StyleSheet } from 'react-native';
import { palette, spacing } from '../../theme/tokens';
import { sharedStyles } from '../shared.styles';

export const styles = StyleSheet.create({
  container: sharedStyles.screenContainer,
  centered: sharedStyles.centered,
  backButton: { alignSelf: 'flex-start', marginBottom: spacing.sm / 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { ...sharedStyles.screenTitle, marginBottom: 0 },
  card: { marginBottom: spacing.md, borderRadius: spacing.md, backgroundColor: palette.white },
  hint: { color: palette.neutralText, marginBottom: spacing.md },
  input: { marginBottom: spacing.sm },
  error: { color: palette.danger, marginBottom: spacing.sm },
  submitButton: { marginTop: spacing.sm },
  cancelButton: { marginTop: spacing.sm },
  successIcon: { fontSize: 58, marginBottom: spacing.sm },
  successText: { fontWeight: '700', marginBottom: spacing.sm / 2 },
  successHint: { color: palette.neutralText, textAlign: 'center', marginBottom: spacing.lg },
});

