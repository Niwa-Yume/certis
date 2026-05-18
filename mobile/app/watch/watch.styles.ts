import { StyleSheet } from 'react-native';
import { palette, spacing } from '../../theme/tokens';
import { sharedStyles } from '../shared.styles';

export const styles = StyleSheet.create({
  container: sharedStyles.screenContainer,
  centered: sharedStyles.centered,
  title: sharedStyles.screenTitle,
  card: { marginBottom: spacing.md, borderRadius: spacing.md },
  chip: { marginTop: spacing.sm, alignSelf: 'flex-start', backgroundColor: palette.porscheGreenSoft },
  qrContainer: { alignItems: 'center' },
  hint: { color: palette.neutralText, marginBottom: spacing.md, textAlign: 'center' },
  countdown: { fontSize: 48, fontWeight: '700', marginTop: spacing.md },
});

export const getCountdownColor = (secondsLeft: number) => {
  if (secondsLeft > 15) return palette.success;
  if (secondsLeft > 5) return palette.warning;
  return palette.danger;
};

