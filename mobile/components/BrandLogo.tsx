import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { palette } from '../theme/tokens';

type BrandLogoProps = {
  size?: number;
};

export default function BrandLogo({ size = 56 }: BrandLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: Math.round(size * 0.15) }]}>
      <Text style={[styles.monogram, { fontSize: Math.max(16, size * 0.42) }]}>AP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.porscheGreen,
    backgroundColor: '#070D09',
  },
  monogram: {
    color: palette.primaryGoldSoft,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
