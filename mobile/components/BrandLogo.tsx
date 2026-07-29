import { Image, StyleSheet, View } from 'react-native';
import { palette } from '../theme/tokens';

const apLogo = require('../assets/logo AP.jpeg');

type BrandLogoProps = {
  size?: number;
};

export default function BrandLogo({ size = 56 }: BrandLogoProps) {
  const borderRadius = Math.round(size * 0.15);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius }] }>
      <Image source={apLogo} style={{ width: size, height: size, borderRadius }} resizeMode="cover" />
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
