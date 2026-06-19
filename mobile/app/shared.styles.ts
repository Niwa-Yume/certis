import { StyleSheet } from 'react-native';
import { palette, spacing } from '../theme/tokens';

export const sharedStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    backgroundColor: palette.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    padding: spacing.lg,
  },
  screenTitle: {
    marginBottom: spacing.md,
    fontWeight: '700',
    color: palette.textStrong,
  },
});

