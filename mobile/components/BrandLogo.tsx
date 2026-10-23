import { Image, StyleSheet, View } from 'react-native';
import { palette } from '../theme/tokens';

// Logo provisoire : l'identité visuelle définitive est choisie en Phase 4.
const certisLogo = require('../assets/logo-certis.png');

type BrandLogoProps = {
  size?: number;
};

export default function BrandLogo({ size = 56 }: BrandLogoProps) {
  const borderRadius = Math.round(size * 0.15);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius }] }>
      <Image source={certisLogo} style={{ width: size, height: size, borderRadius }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.porscheGreen,
    overflow: 'hidden',
  },
});
