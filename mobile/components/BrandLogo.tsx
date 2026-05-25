import { Image, StyleSheet, View } from 'react-native';

type BrandLogoProps = {
  size?: number;
};

export default function BrandLogo({ size = 56 }: BrandLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image source={require('../assets/logo-certis.png')} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});

