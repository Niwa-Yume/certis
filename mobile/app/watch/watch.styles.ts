import { StyleSheet } from 'react-native';
import { palette, radius, spacing } from '../../theme/tokens';
import { sharedStyles } from '../shared.styles';

export const styles = StyleSheet.create({
  container: sharedStyles.screenContainer,
  centered: sharedStyles.centered,
  content: { paddingBottom: spacing.xl },
  backButton: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md / 2 },
  title: { ...sharedStyles.screenTitle, marginBottom: spacing.xs },
  subtitle: { color: palette.neutralText, marginBottom: spacing.md },
  card: {
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  detailsCardContent: { gap: spacing.sm },
  watchImage: { height: 260 },
  sectionTitle: { fontWeight: '700', color: palette.textStrong },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { color: palette.neutralText },
  rowValue: { color: palette.textStrong, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: spacing.xs },
  chip: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: palette.porscheGreenSoft,
    borderRadius: radius.pill,
  },
  chipText: { color: palette.porscheGreen, fontWeight: '700' },
  qrContainer: { alignItems: 'center' },
  qrCardHeader: { width: '100%', marginBottom: spacing.md },
  hint: { color: palette.neutralText, marginBottom: spacing.md, textAlign: 'center' },
  qrWrap: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    marginBottom: spacing.sm,
  },
  countdown: { fontSize: 48, fontWeight: '700', marginTop: spacing.md },
  transferButton: { marginTop: spacing.sm },
  emptyImage: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.porscheGreenSoft,
  },
  emptyImageText: { color: palette.porscheGreen, fontWeight: '600' },
});

export const getCountdownColor = (secondsLeft: number) => {
  if (secondsLeft > 15) return palette.success;
  if (secondsLeft > 5) return palette.warning;
  return palette.danger;
};

