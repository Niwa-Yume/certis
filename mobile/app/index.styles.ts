import { StyleSheet } from 'react-native';
import { palette, spacing } from '../theme/tokens';
import { sharedStyles } from './shared.styles';

export const styles = StyleSheet.create({
  container: sharedStyles.screenContainer,
  centered: sharedStyles.centered,
  title: sharedStyles.screenTitle,
  card: { marginBottom: spacing.md, borderRadius: spacing.md },
  status: { marginTop: spacing.sm / 2, color: palette.neutralText },
});

