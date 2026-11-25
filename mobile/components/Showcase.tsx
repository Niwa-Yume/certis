import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { color, space } from '../theme/tokens';
import { NoPhoto, usePhoto } from './WatchPhoto';
import { useLayout } from './ui';

/**
 * La pièce prend toute la place et l'interface s'efface : la photo couvre 55 % du premier écran sur
 * mobile, la moitié gauche sur ordinateur ; le contenu défile à côté ou dessous.
 */
export default function Showcase({ imageUrl, cutout, label, children }: {
    imageUrl: string | null; cutout: boolean; label: string; children: ReactNode;
}) {
    const { wide, height, gutter } = useLayout();
    const { photo, onError } = usePhoto(imageUrl, cutout);
    const hero = (
        <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={label}
            style={[styles.hero, wide ? { width: '50%', height: '100%' } : { height: Math.max(360, Math.round(height * 0.55)) }]}
        >
            {photo ? (
                <Image source={photo.source} onError={onError} resizeMode={photo.cutout ? 'contain' : 'cover'} style={StyleSheet.absoluteFill} />
            ) : (
                <NoPhoto />
            )}
        </View>
    );
    const content = <View style={[styles.content, { padding: gutter }]}>{children}</View>;
    return wide ? (
        <View style={[styles.screen, { flexDirection: 'row' }]}>
            {hero}
            <ScrollView style={{ flex: 1 }}>{content}</ScrollView>
        </View>
    ) : (
        <ScrollView style={styles.screen}>
            {hero}
            {content}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: color.paper },
    hero: { backgroundColor: color.deep, overflow: 'hidden' },
    content: { width: '100%', maxWidth: 560 + 2 * space.xxl, gap: space.lg, paddingBottom: space.xxl },
});
