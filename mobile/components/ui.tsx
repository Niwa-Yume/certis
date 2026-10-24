import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
    Animated,
    Easing,
    Platform,
    Pressable,
    type StyleProp,
    StyleSheet,
    Text,
    TextInput,
    type TextInputProps,
    type TextStyle,
    View,
    type ViewStyle,
    useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop, Text as SvgText, TextPath } from 'react-native-svg';
import { breakpoint, color, font, maxContent, motion } from '../theme/tokens';

// ── Mise en page ────────────────────────────────────────────────────────

export function useLayout() {
    const { width, height } = useWindowDimensions();
    const size = width >= breakpoint.wide ? 'wide' : width >= breakpoint.medium ? 'medium' : 'compact';
    return { width, height, size, wide: size === 'wide', compact: size === 'compact', gutter: size === 'compact' ? 20 : 40 };
}

/** Équivalent de clamp(min, vw, max) en CSS. */
export const fluid = (width: number, min: number, vw: number, max: number) =>
    Math.round(Math.min(max, Math.max(min, (width * vw) / 100)));

export function Container({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
    const { gutter } = useLayout();
    return <View style={[{ width: '100%', maxWidth: maxContent, alignSelf: 'center', paddingHorizontal: gutter }, style]}>{children}</View>;
}

/** Styles réservés au web (transitions CSS, curseur, ombre portée), ignorés ailleurs. */
// Type vide : assignable aux styles de vue comme d'image, sans connaître les propriétés CSS.
export const web = (style: object) => (Platform.OS === 'web' ? (style as {}) : null);
export const transition = (property: string, ms = 250) =>
    web({ transitionProperty: property, transitionDuration: `${ms}ms`, transitionTimingFunction: 'cubic-bezier(.2,.7,.2,1)' });

// ── Mouvement ───────────────────────────────────────────────────────────

/** null tant que le réglage système n'est pas connu. */
export function useReducedMotion() {
    const [reduced, setReduced] = useState<boolean | null>(null);
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduced, () => setReduced(false));
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
        return () => sub.remove();
    }, []);
    return reduced;
}

/** Valeur 0 → 1 jouée une fois à l'entrée, immédiatement à 1 si l'utilisateur réduit les animations. */
export function useEntrance(delay = 0, duration = 900, native = motion.native, easing = motion.ease) {
    const reduced = useReducedMotion();
    const value = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (reduced === null) return;
        if (reduced) return value.setValue(1);
        const anim = Animated.timing(value, { toValue: 1, duration, delay, easing, useNativeDriver: native });
        anim.start();
        return () => anim.stop();
    }, [reduced, value, delay, duration, native, easing]);
    return value;
}

const range = (v: Animated.Value, from: number | string, to: number | string) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [from, to] as number[] | string[] });

export function Rise({ children, delay = 0, distance = 18, style }: { children: ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
    const v = useEntrance(delay);
    return <Animated.View style={[style, { opacity: v, transform: [{ translateY: range(v, distance, 0) }] }]}>{children}</Animated.View>;
}

/** Les lettres se resserrent : le grand mot se pose. */
export function TrackIn({ children, size, style, delay = 0, from = 0.35, to = -0.02, opacity = 1 }: {
    children: string; size: number; style?: StyleProp<TextStyle>; delay?: number; from?: number; to?: number; opacity?: number;
}) {
    const v = useEntrance(delay, 1100, false);
    return (
        <Animated.Text
            numberOfLines={1}
            maxFontSizeMultiplier={1}
            style={[style, { fontSize: size, lineHeight: size * 1.05, opacity: range(v, 0, opacity), letterSpacing: range(v, size * from, size * to) }]}
        >
            {children}
        </Animated.Text>
    );
}

/** Le sceau se pose : léger dépassement puis immobile. */
export function Stamp({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
    const v = useEntrance(delay, 550, motion.native, motion.stamp);
    return (
        <Animated.View style={[style, { opacity: v, transform: [{ scale: range(v, 1.4, 1) }, { rotate: range(v, '-14deg', '0deg') }] }]}>
            {children}
        </Animated.View>
    );
}

// ── Typographie ─────────────────────────────────────────────────────────

export const t = StyleSheet.create({
    body: { fontFamily: font.body, fontSize: 16, lineHeight: 24, color: color.ink },
    lead: { fontFamily: font.body, fontSize: 18, lineHeight: 28, color: color.ink },
    small: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.slate },
    label: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.slate },
    medium: { fontFamily: font.bodyMedium },
    strong: { fontFamily: font.bodySemi },
    caps: { fontFamily: font.wideMedium, fontSize: 13, letterSpacing: 2.6, color: color.slate },
    mono: { fontFamily: font.mono, fontSize: 13, lineHeight: 18, color: color.slate },
    serif: { fontFamily: font.serif, color: color.ink },
    italic: { fontFamily: font.serifItalic },
    wide: { fontFamily: font.wide, color: color.ink },
    ref: { fontFamily: font.wideMedium, letterSpacing: 0.3, color: color.ink },
});

export function Wordmark({ tone = color.ink, size = 13 }: { tone?: string; size?: number }) {
    return (
        <Text accessibilityRole="header" accessibilityLabel="Certis" style={{ fontFamily: font.wideMedium, fontSize: size, letterSpacing: size * 0.26, color: tone }}>
            CERTIS
        </Text>
    );
}

/** « Carrera » droit + « Calibre S » italique bleu sceau, comme sur le certificat. */
export function PieceName({ parts, size, style, accent = color.seal, stacked = false }: {
    parts: [string, string]; size: number; style?: StyleProp<TextStyle>; accent?: string; stacked?: boolean;
}) {
    return (
        <Text accessibilityRole="header" style={[t.serif, { fontSize: size, lineHeight: size * 0.95 }, style]}>
            {parts[0]}
            {parts[1] ? <Text style={[t.italic, { color: accent }]}>{stacked ? '\n' : ' '}{parts[1]}</Text> : null}
        </Text>
    );
}

// ── Icônes (traits de 24 px, comme les maquettes) ────────────────────────

const ICONS = {
    arrow: 'M5 12h14M13 6l6 6-6 6',
    back: 'M15 5l-7 7 7 7',
    check: 'M5 12l5 5L20 7',
    transfer: 'M4 8h13l-4-4M20 16H7l4 4',
    loupe: 'M17 10.5a6.5 6.5 0 1 1-13 0a6.5 6.5 0 1 1 13 0M15.5 15.5L21 21',
    close: 'M6 6l12 12M18 6L6 18',
    plus: 'M12 5v14M5 12h14',
    alert: 'M12 7v7M12 17.5v.5',
};

export function Icon({ name, size = 20, tone = color.ink, weight = 1.6 }: { name: keyof typeof ICONS; size?: number; tone?: string; weight?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tone} strokeWidth={weight} aria-hidden>
            <Path d={ICONS[name]} />
        </Svg>
    );
}

// ── Actions ─────────────────────────────────────────────────────────────

const BUTTON = {
    primary: { bg: color.seal, fg: color.paper, arrow: color.gold, border: color.seal },
    light: { bg: color.paper, fg: color.seal, arrow: color.seal, border: color.paper },
    secondary: { bg: 'transparent', fg: color.ink, arrow: color.ink, border: color.ink },
    outlineLight: { bg: 'transparent', fg: color.paper, arrow: color.gold, border: 'rgba(244,241,234,0.5)' },
};

type PressState = { pressed: boolean; hovered?: boolean };

export function Button({ label, onPress, variant = 'primary', arrow = false, loading = false, disabled = false, style, accessibilityLabel }: {
    label: string; onPress: () => void; variant?: keyof typeof BUTTON; arrow?: boolean; loading?: boolean; disabled?: boolean;
    style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
    const c = BUTTON[variant];
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
            style={(s) => [
                styles.button,
                { backgroundColor: c.bg, borderColor: c.border, justifyContent: arrow ? 'space-between' : 'center', opacity: disabled ? 0.5 : 1 },
                (s as PressState).pressed && { transform: [{ scale: 0.98 }] },
                transition('transform', 150),
                style,
            ]}
        >
            {(s) => (
                <>
                    <Text style={[t.body, t.medium, { color: c.fg }]}>{label}</Text>
                    {loading ? (
                        <ActivityIndicator color={c.arrow} />
                    ) : arrow ? (
                        <View style={[{ transform: [{ translateX: (s as PressState).hovered ? 4 : 0 }] }, transition('transform')]}>
                            <Icon name="arrow" size={18} tone={c.arrow} />
                        </View>
                    ) : null}
                </>
            )}
        </Pressable>
    );
}

/** Lien texte souligné au survol (web), cible de 44 px. */
export function TextLink({ label, onPress, tone = color.seal, style }: { label: string; onPress: () => void; tone?: string; style?: StyleProp<ViewStyle> }) {
    return (
        <Pressable onPress={onPress} accessibilityRole="link" style={[styles.textLink, style]}>
            {(s) => (
                <Text style={[t.body, t.medium, { color: tone, textDecorationLine: (s as PressState).hovered ? 'underline' : 'none' }]}>{label}</Text>
            )}
        </Pressable>
    );
}

export function IconButton({ icon, label, onPress, tone = color.ink, bordered = false }: {
    icon: keyof typeof ICONS; label: string; onPress: () => void; tone?: string; bordered?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={(s) => [styles.iconButton, bordered && { borderWidth: 1, borderColor: tone }, (s as PressState).pressed && { transform: [{ scale: 0.96 }] }]}
        >
            <Icon name={icon} size={22} tone={tone} />
        </Pressable>
    );
}

/** Copier dans le presse-papiers (web). Sur mobile, le texte voisin est sélectionnable. */
export function CopyButton({ value, what }: { value: string; what: string }) {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 1600);
        return () => clearTimeout(timer);
    }, [copied]);
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard) return null;
    return (
        <Pressable
            onPress={() => navigator.clipboard.writeText(value).then(() => setCopied(true), () => undefined)}
            accessibilityRole="button"
            accessibilityLabel={copied ? `${what} copiée` : `Copier ${what}`}
            style={styles.copy}
        >
            <Text accessibilityLiveRegion="polite" style={[t.label, t.medium, { color: color.seal }]}>{copied ? 'Copié' : 'Copier'}</Text>
        </Pressable>
    );
}

// ── Formulaires ─────────────────────────────────────────────────────────

export function TextField({ label, error, hint, ...input }: TextInputProps & { label: string; error?: string | null; hint?: string }) {
    return (
        <View style={{ gap: 6 }}>
            <Text style={[t.label, t.medium, { color: color.ink }]}>{label}</Text>
            <TextInput
                accessibilityLabel={label}
                placeholderTextColor={color.slate}
                style={[styles.input, error ? { borderColor: color.refused } : null]}
                {...input}
            />
            {error ? (
                <Text accessibilityLiveRegion="polite" style={[t.small, { color: color.refused }]}>{error}</Text>
            ) : hint ? (
                <Text style={t.small}>{hint}</Text>
            ) : null}
        </View>
    );
}

// ── Signes ──────────────────────────────────────────────────────────────

export function Badge({ label, tone = 'verified' }: { label: string; tone?: 'verified' | 'refused' }) {
    return (
        <View style={[styles.badge, { backgroundColor: tone === 'verified' ? color.verified : color.refused }]}>
            <Icon name={tone === 'verified' ? 'check' : 'alert'} size={14} tone={color.white} weight={2.5} />
            <Text style={[t.label, t.medium, { color: color.white }]}>{label}</Text>
        </View>
    );
}

const useSvgId = (prefix: string) => prefix + useId().replace(/[^a-zA-Z0-9]/g, '');

/** L'unique ornement : le sceau du registre, avec le numéro de la pièce en microtexte. */
export function Seal({ number, size = 96 }: { number: string; size?: number }) {
    const arc = useSvgId('arc');
    return (
        <Svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
            <Defs>
                <Path id={arc} d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
            </Defs>
            <Circle cx={60} cy={60} r={57} fill={color.deep} stroke={color.gold} strokeWidth={0.8} />
            <SvgText fontFamily={font.mono} fontSize={5.6} letterSpacing={1.5} fill={color.gold}>
                <TextPath href={`#${arc}`}>{`CERTIS · REGISTRE DES GARDE-TEMPS · ${number} ·`}</TextPath>
            </SvgText>
            <Circle cx={60} cy={60} r={36} fill={color.seal} stroke={color.gold} strokeWidth={0.6} />
            <Path d="M46 61l9 9 19-21" fill="none" stroke={color.paper} strokeWidth={3.5} />
        </Svg>
    );
}

/** Halo doré derrière la pièce, comme une lumière de vitrine. */
export function Glow({ cx = '50%', cy = '52%', rx = '60%', ry = '55%', strength = 0.28 }: { cx?: string; cy?: string; rx?: string; ry?: string; strength?: number }) {
    const id = useSvgId('glow');
    return (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
            <Defs>
                <RadialGradient id={id} cx={cx} cy={cy} rx={rx} ry={ry}>
                    <Stop offset="0" stopColor={color.gold} stopOpacity={strength} />
                    <Stop offset="0.72" stopColor={color.seal} stopOpacity={0} />
                </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
    );
}

/** Seule boucle autorisée : l'attente. Immobile si l'utilisateur réduit les animations. */
export function Spinner({ size = 120, track = 'rgba(244,241,234,0.15)' }: { size?: number; track?: string }) {
    const reduced = useReducedMotion();
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (reduced !== false) return;
        const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: motion.native }));
        loop.start();
        return () => loop.stop();
    }, [reduced, spin]);
    return (
        <Animated.View style={{ transform: [{ rotate: range(spin, '0deg', '360deg') }] }} aria-hidden>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Circle cx={60} cy={60} r={46} fill="none" stroke={track} strokeWidth={2} />
                <Circle cx={60} cy={60} r={46} fill="none" stroke={color.gold} strokeWidth={2} strokeDasharray="72 217" strokeLinecap="round" />
            </Svg>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    button: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, borderWidth: 1 },
    textLink: { minHeight: 44, justifyContent: 'center' },
    iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    copy: { minHeight: 32, minWidth: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: color.hairline },
    input: {
        minHeight: 52,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: color.slate,
        backgroundColor: color.card,
        fontFamily: font.body,
        fontSize: 16,
        color: color.ink,
    },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
});
