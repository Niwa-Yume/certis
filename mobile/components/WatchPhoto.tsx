import { type ReactNode, useMemo, useRef, useState } from 'react';
import { Image, type ImageSourcePropType, PanResponder, Platform, type PointerEvent, StyleSheet, Text, View } from 'react-native';
import watchImages from '../lib/watchImages';
import { color } from '../theme/tokens';
import { t, web } from './ui';

export type Photo = { source: ImageSourcePropType; cutout: boolean };

/** La photo fournie par l'émetteur, sinon celle du registre de démo ; null si aucune ne s'affiche. */
export function usePhoto(reference: string, imageUrl?: string | null) {
    const [failed, setFailed] = useState(false);
    const url = imageUrl?.trim();
    const photo: Photo | null = url && !failed ? { source: { uri: url }, cutout: false } : (watchImages[reference] ?? null);
    return { photo, onError: () => setFailed(true) };
}

export function NoPhoto({ tone = color.mist }: { tone?: string }) {
    return (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={[t.mono, { color: tone }]}>Photographie à venir</Text>
        </View>
    );
}

type Point = { x: number; y: number };

/**
 * La pièce en héros, inspectable à la loupe : survol à la souris sur web, appui maintenu
 * puis glisser sur mobile, ou loupe épinglée au centre par le bouton « Inspecter le cadran ».
 */
export function WatchVisual({ photo, onError, label, width: W, height: H, lens: L = 124, zoom: Z = 2.8, pinned = false, children }: {
    photo: Photo | null; onError?: () => void; label: string; width: number; height: number;
    lens?: number; zoom?: number; pinned?: boolean; children?: ReactNode;
}) {
    const [pos, setPos] = useState<Point | null>(null);
    const holding = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const clamp = (x: number, y: number) => ({ x: Math.max(0, Math.min(W, x)), y: Math.max(0, Math.min(H, y)) });

    const release = () => {
        clearTimeout(timer.current);
        holding.current = false;
        setPos(null);
    };

    // Mobile : la loupe n'apparaît qu'après 250 ms d'appui, pour laisser le défilement libre.
    const touch = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
            const { locationX, locationY } = e.nativeEvent;
            timer.current = setTimeout(() => {
                holding.current = true;
                setPos(clamp(locationX, locationY));
            }, 250);
        },
        onPanResponderMove: (e) => {
            if (holding.current) setPos(clamp(e.nativeEvent.locationX, e.nativeEvent.locationY));
        },
        onPanResponderTerminationRequest: () => !holding.current,
        onPanResponderRelease: () => release(),
        onPanResponderTerminate: () => release(),
    }), [W, H]);

    // Web : survol à la souris uniquement ; au doigt, le bouton « Inspecter » suffit.
    const hover = {
        onPointerMove: (e: PointerEvent) => {
            const { pointerType, clientX, clientY } = e.nativeEvent;
            if (pointerType !== 'mouse') return;
            const r = (e.currentTarget as unknown as HTMLElement).getBoundingClientRect();
            setPos(clamp(((clientX - r.left) * W) / r.width, ((clientY - r.top) * H) / r.height));
        },
        onPointerLeave: () => setPos(null),
    };

    const p = pos ?? (pinned ? { x: W * 0.5, y: H * 0.45 } : null);
    // Détourage : ombre portée, et bracelet fondu aux extrémités plutôt que coupé net.
    const fade = 'linear-gradient(to bottom, transparent 0, #000 9%, #000 91%, transparent 100%)';
    // Le masque rognerait l'ombre aux bords de la boîte : ombre sur le conteneur, masque sur l'image.
    const shadow = photo?.cutout ? web({ filter: 'drop-shadow(0 20px 26px rgba(0,0,0,0.4))' }) : null;
    const mask = photo?.cutout ? web({ maskImage: fade, WebkitMaskImage: fade }) : null;

    return (
        <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={label}
            style={[{ width: W, height: H }, photo ? web({ cursor: 'zoom-in' }) : null]}
            {...(photo ? (Platform.OS === 'web' ? hover : touch.panHandlers) : null)}
        >
            {photo ? (
                <View style={shadow}>
                    <Image source={photo.source} onError={onError} resizeMode="contain" style={[{ width: W, height: H }, mask]} />
                </View>
            ) : (
                <NoPhoto />
            )}
            {children}
            {photo && p ? (
                <View style={[styles.lens, { left: p.x - L / 2, top: p.y - L / 2, width: L, height: L, borderRadius: L / 2 }]}>
                    <Image
                        source={photo.source}
                        resizeMode="contain"
                        style={{ position: 'absolute', width: W * Z, height: H * Z, left: -(p.x * Z - L / 2), top: -(p.y * Z - L / 2) }}
                    />
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    lens: {
        position: 'absolute',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: color.gold,
        backgroundColor: color.seal,
        pointerEvents: 'none',
        boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
    },
});
