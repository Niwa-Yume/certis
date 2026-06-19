import { StyleSheet } from 'react-native';
import { palette, radius, spacing } from '../theme/tokens';
import { sharedStyles } from './shared.styles';

export const styles = StyleSheet.create({
  container: sharedStyles.screenContainer,
  centered: sharedStyles.centered,
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...sharedStyles.screenTitle, marginBottom: 0, fontSize: 28 },
  subtitle: { color: palette.neutralText, marginTop: spacing.xs, marginBottom: spacing.lg },
  hero: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: palette.surfaceElevated,
    marginBottom: spacing.md,
  },
  collectionTag: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: palette.primaryGoldSoft,
    backgroundColor: palette.porscheGreenSoft,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  addButton: { marginBottom: spacing.lg },
  listContent: { paddingBottom: spacing.xl },
  card: {
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  watchImage: { height: 210 },
  status: { marginTop: spacing.sm / 2, color: palette.primaryGoldSoft },
  emptyCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyHint: { textAlign: 'center', color: palette.neutralText, marginTop: spacing.sm },
});

