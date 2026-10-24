import type { ImageSourcePropType } from 'react-native';

// Photos de démo, appariées à la référence exacte qu'elles montrent (ADR-0009).
// `cutout` : fond transparent, la montre peut flotter sur le bleu sceau.
const watchImages: Record<string, { source: ImageSourcePropType; cutout: boolean }> = {
    '126610LN': { source: require('../assets/watch/submariner.webp'), cutout: false },
    '15202ST.OO.1240ST.01': { source: require('../assets/watch/royal-oak.webp'), cutout: true },
    'CV7A12.BA0795': { source: require('../assets/watch/carrera.webp'), cutout: true },
};

export default watchImages;
