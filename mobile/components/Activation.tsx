import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, Vibration, View } from 'react-native';
import { tr } from '../lib/i18n';
import { color, motion, space, typeScale } from '../theme/tokens';
import { Icon, t, useReducedMotion } from './ui';

/**
 * Le seul geste animé signature de l'app (lot 4) : à la remise, la carte du passeport se pose, un
 * filet de métal la parcourt, puis « Passeport actif » s'inscrit, avec une vibration légère.
 * Trois temps de 300 à 400 ms, une seule fois ; immobile sous prefers-reduced-motion.
 */
export default function Activation({ piece, house }: { piece: string; house: string }) {
    const reduced = useReducedMotion();
    const enter = useRef(new Animated.Value(0)).current;
    const sweep = useRef(new Animated.Value(0)).current;
    const seal = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (reduced === null) return;
        const buzz = () => Vibration.vibrate(30);
        if (reduced) {
            [enter, sweep, seal].forEach((v) => v.setValue(1));
            buzz();
            return;
        }
        const step = (v: Animated.Value, duration: number) =>
            Animated.timing(v, { toValue: 1, duration, easing: motion.ease, useNativeDriver: motion.native });
        const run = Animated.sequence([step(enter, 300), step(sweep, motion.slow), step(seal, 300)]);
        run.start(({ finished }) => finished && buzz());
        return () => run.stop();
    }, [reduced, enter, sweep, seal]);

    const range = (v: Animated.Value, a: number, b: number) => v.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
    return (
        <Animated.View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${tr.activation.badge} : ${piece}, ${house}`}
            style={[styles.card, { opacity: enter, transform: [{ scale: range(enter, 0.96, 1) }] }]}
        >
            {/* Le filet de métal : il traverse la carte une fois, puis reste posé en haut. */}
            <Animated.View
                aria-hidden
                style={[styles.sweep, { opacity: range(sweep, 0.4, 1), transform: [{ scaleX: sweep }] }]}
            />
            <Text style={[t.caps, { color: color.metal }]}>{house}</Text>
            <Text numberOfLines={2} style={[t.serif, { color: color.onDeep, fontSize: typeScale.title, lineHeight: typeScale.title * 1.05 }]}>
                {piece}
            </Text>
            <Animated.View style={[styles.badge, { opacity: seal, transform: [{ scale: range(seal, 0.9, 1) }] }]}>
                <View style={styles.check}>
                    <Icon name="check" size={18} tone={color.onSignal} weight={2.5} />
                </View>
                <Text style={[t.body, t.strong, { color: color.onDeep }]}>{tr.activation.badge}</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%', maxWidth: 400, aspectRatio: 1.586, padding: space.lg, gap: space.sm,
        justifyContent: 'space-between', backgroundColor: color.deep, borderRadius: 16, overflow: 'hidden',
    },
    sweep: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: color.metal, transformOrigin: 'left' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    check: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.verified, alignItems: 'center', justifyContent: 'center' },
});
