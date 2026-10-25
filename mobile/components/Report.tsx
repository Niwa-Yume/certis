import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import axios from 'axios';
import api from '../lib/api';
import { capsDate, clock, longDate, registryNumber, shortDate, splitName } from '../lib/format';
import { type EventType, SPEC_LABELS, type Specs, describeEvent, downloadJson } from '../lib/registry';
import { color, font, motion, space } from '../theme/tokens';
import { WatchVisual, usePhoto } from './WatchPhoto';
import {
    Badge, Button, Container, CopyButton, Glow, Icon, PieceName, Rise, Seal, Stamp, TextField, TextLink, TrackIn, Wordmark,
    fluid, t, transition, useEntrance, useLayout, useReducedMotion, web,
} from './ui';

/** Réponse de POST /assets/:id/authenticate quand passeport, chaîne et registre concordent. */
export type Verification = {
    valid: true;
    verifiedAt: string;
    status: 'ACTIVE' | 'STOLEN';
    imageCutout: boolean;
    // Tout ce que voit l'acheteur vient du passeport signé par l'émetteur (ADR-0004).
    passport: {
        issuer: { id: string; name: string };
        validFrom: string;
        credentialSubject: {
            id: string; brand: string; model: string; name: string; reference: string;
            specs: Specs; image: string | null;
        };
    };
    provenance: { type: EventType; at: string; note?: string }[];
    proof: { passport: string; events: { seq: number; hash: string }[]; anchors: unknown[]; keys: string };
};

const CHECKS = (reference: string) => [
    `Comparez la référence ${reference} avec la pièce et ses papiers.`,
    'Assurez-vous que le QR a été généré devant vous, par le vendeur.',
    'En cas de doute, faites examiner la pièce par un revendeur agréé de la marque.',
];

/** Le rapport d'une vérification réussie : la pièce, son certificat, sa provenance, la preuve. */
export default function Report({ result, nonce }: { result: Verification; nonce: string }) {
    const layout = useLayout();
    const reduced = useReducedMotion();
    const scroll = useRef<ScrollViewHandle>(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [sections, setSections] = useState<Record<string, number>>({});
    const asset = result.passport.credentialSubject;
    const number = registryNumber(asset.id);
    const at = (key: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
        const y = e.nativeEvent.layout.y;
        setSections((s) => (s[key] === y ? s : { ...s, [key]: y }));
    };

    // Effets liés au défilement : la pile s'éclate et la provenance s'allume à mesure qu'on lit.
    const lit = (y: number | undefined) =>
        reduced !== false || y === undefined
            ? 1
            : scrollY.interpolate({ inputRange: [y - layout.height * 0.95, y - layout.height * 0.55], outputRange: [0.25, 1], extrapolate: 'clamp' });

    return (
        <Animated.ScrollView
            ref={scroll as never}
            nativeID="report"
            style={{ flex: 1, backgroundColor: color.paper }}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: motion.native })}
        >
            {layout.wide ? (
                <WideHero result={result} number={number} />
            ) : (
                <CompactHero result={result} number={number} onReport={() => scroll.current?.scrollTo({ y: sections.fiche ?? 0 })} />
            )}

            <View onLayout={at('fiche')}>
                <Fiche result={result} number={number} nonce={nonce} />
            </View>

            <View onLayout={at('anatomy')} style={styles.ruled}>
                <Anatomy result={result} scrollY={scrollY} top={sections.anatomy} />
            </View>

            <View onLayout={at('provenance')} style={styles.ruled}>
                <Container style={{ paddingVertical: layout.compact ? 64 : 110, gap: 28 }}>
                    <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={t.caps}>PROVENANCE</Text>
                    <View>
                        {[
                            ...result.provenance.map((p) => ({ at: p.at, ...describeEvent(p.type, { issuer: result.passport.issuer.name, note: p.note }) })),
                            { at: result.verifiedAt, label: 'Vérification publique', note: 'ce rapport' },
                        ].map((p, i) => (
                            <Animated.View key={i} style={[styles.event, { opacity: lit(sections.provenance === undefined ? undefined : sections.provenance + 120 + i * 100) }]}>
                                <Text style={[t.wide, { fontSize: fluid(layout.width, 26, 3.6, 52), letterSpacing: -0.3 }]}>{capsDate(p.at)}</Text>
                                <Text style={[t.serif, t.italic, { fontSize: fluid(layout.width, 26, 3.2, 46) }]}>{p.label}</Text>
                                <Text style={t.small}>{p.note}</Text>
                            </Animated.View>
                        ))}
                    </View>
                </Container>
            </View>

            <Proof result={result} />
        </Animated.ScrollView>
    );
}

type ScrollViewHandle = { scrollTo: (o: { y: number }) => void };


// ── Héros ───────────────────────────────────────────────────────────────

/** Balayage doré qui parcourt la pièce une fois, avant le verdict. */
function ScanLine({ height, delay }: { height: number; delay: number }) {
    const v = useEntrance(delay, 1000, motion.native, Easing.bezier(0.4, 0, 0.2, 1));
    return (
        <Animated.View
            aria-hidden
            nativeID="scan"
            style={[
                styles.scan,
                web({ boxShadow: '0 0 18px 4px rgba(201,166,107,0.45)' }),
                {
                    opacity: v.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
                    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }],
                },
            ]}
        >
            <Svg width="100%" height={2}>
                <Defs>
                    <LinearGradient id="scan" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={color.gold} stopOpacity={0} />
                        <Stop offset="0.5" stopColor={color.gold} stopOpacity={1} />
                        <Stop offset="1" stopColor={color.gold} stopOpacity={0} />
                    </LinearGradient>
                </Defs>
                <Rect width="100%" height={2} fill="url(#scan)" />
            </Svg>
        </Animated.View>
    );
}

function Piece({ result, number, width, height, lens, zoom, pinned, seal }: {
    result: Verification; number: string; width: number; height: number; lens?: number; zoom?: number; pinned?: boolean; seal: number;
}) {
    const asset = result.passport.credentialSubject;
    const { photo, onError } = usePhoto(asset.image, result.imageCutout);
    return (
        <WatchVisual
            photo={photo} onError={onError} width={width} height={height} lens={lens} zoom={zoom} pinned={pinned}
            label={`${asset.brand} ${asset.name}, référence ${asset.reference}, vérifiée`}
        >
            <ScanLine height={height} delay={300} />
            <Stamp delay={1200} style={{ position: 'absolute', left: width * 0.77, top: height * 0.71 }}>
                <Seal number={number} size={seal} />
            </Stamp>
        </WatchVisual>
    );
}

function CompactHero({ result, number, onReport }: { result: Verification; number: string; onReport: () => void }) {
    const { width } = useLayout();
    const asset = result.passport.credentialSubject;
    return (
        <View style={styles.navy}>
            <Glow cy="25%" rx="70%" ry="40%" strength={0.26} />
            <View style={styles.compactHeader}>
                <Wordmark tone={color.paper} />
                <Text style={[t.mono, { color: color.mist }]}>{shortDate(result.verifiedAt)} · {clock(result.verifiedAt).replace(' h ', ':')}</Text>
            </View>
            <Rise distance={24} scale={0.97} style={{ alignSelf: 'center', marginTop: 14 }}>
                <Piece result={result} number={number} width={167} height={300} seal={88} />
            </Rise>
            <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: 22, gap: 6, marginTop: 20 }}>
                <Rise delay={1250} distance={14}>
                    <Text style={[t.serif, t.italic, { color: color.paper, fontSize: 30, lineHeight: 30 }]}>Cette pièce est</Text>
                </Rise>
                <TrackIn size={Math.min(34, (width - 44) / (11 * 0.8))} delay={1300} from={0.3} to={0.03} style={[t.wide, { color: color.gold }]}>
                    AUTHENTIQUE
                </TrackIn>
                <Rise delay={1500} distance={14}>
                    <Text style={[t.body, { color: color.mist, marginTop: 6 }]}>
                        Son certificat est intact : il n’a pas été modifié depuis son inscription au registre.
                    </Text>
                </Rise>
            </View>
            <Rise delay={1650} distance={14} style={styles.heroCard}>
                <View style={{ gap: 3 }}>
                    <Text style={[t.caps, { fontSize: 12 }]}>{asset.brand.toUpperCase()} · {asset.reference}</Text>
                    <PieceName parts={splitName(asset.name)} size={26} />
                </View>
                <View style={{ gap: 5, paddingTop: 10, borderTopWidth: 1, borderColor: color.hairline }}>
                    <Text style={[t.small, t.strong, { color: color.ink }]}>Avant de conclure</Text>
                    {CHECKS(asset.reference).slice(0, 2).map((c) => (
                        <Text key={c} style={[t.small, { color: color.ink }]}>— {c}</Text>
                    ))}
                </View>
                <Button label="Voir le rapport complet" arrow onPress={onReport} />
            </Rise>
        </View>
    );
}

function WideHero({ result, number }: { result: Verification; number: string }) {
    const { width } = useLayout();
    const [pinned, setPinned] = useState(false);
    const word = Math.min(150, (width * 0.86) / (11 * 0.78));
    const boxW = 340;
    const boxH = 612;
    return (
        <View style={[styles.navy, { minHeight: 900 }]}>
            <Glow cy="62%" rx="34%" ry="52%" strength={0.3} />
            <Container style={styles.wideNav}>
                <Wordmark tone={color.paper} size={15} />
                <Text style={[t.mono, { color: color.mist }]}>N° {number}</Text>
            </Container>
            <View accessibilityRole="header" style={{ paddingTop: 36 }}>
                <Container>
                    <Rise>
                        <Text style={[t.serif, t.italic, { color: color.paper, fontSize: fluid(width, 34, 4, 60), lineHeight: fluid(width, 34, 4, 60) }]}>
                            Cette pièce est
                        </Text>
                    </Rise>
                </Container>
                <TrackIn size={word} delay={100} from={0.3} style={[t.wide, { color: color.paper, textAlign: 'center' }]}>AUTHENTIQUE</TrackIn>
            </View>
            <Rise delay={350} distance={60} duration={1100} style={[styles.widePiece, { left: width / 2 - boxW / 2 }]}>
                <Piece result={result} number={number} width={boxW} height={boxH} lens={170} zoom={2.4} pinned={pinned} seal={96} />
            </Rise>
            <View style={styles.wideFoot}>
                <Container style={styles.wideFootRow}>
                    <Rise delay={500} style={{ maxWidth: 360, gap: 10 }}>
                        <Text style={[t.lead, { color: color.paper }]}>Son certificat est intact : il n’a pas été modifié depuis son inscription au registre.</Text>
                        <Text style={[t.small, { color: color.mist }]}>Vérifiée le {longDate(result.verifiedAt)} à {clock(result.verifiedAt)}</Text>
                        <Pressable nativeID="inspect" onPress={() => setPinned((p) => !p)} accessibilityRole="button" style={styles.inspect}>
                            <Icon name="loupe" size={16} tone={color.mist} />
                            <Text style={[t.mono, { color: color.mist }]}>{pinned ? 'Fermer la loupe' : 'Survolez la montre ou inspectez le cadran'}</Text>
                        </Pressable>
                    </Rise>
                    {Platform.OS === 'web' ? (
                        <Rise delay={650}>
                            <Button nativeID="print-hero" label="Imprimer le rapport" variant="light" arrow onPress={() => window.print()} style={{ minWidth: 260 }} />
                        </Rise>
                    ) : null}
                </Container>
            </View>
        </View>
    );
}

// ── Sections du rapport ─────────────────────────────────────────────────

function Fiche({ result, number, nonce }: { result: Verification; number: string; nonce: string }) {
    const { width, compact } = useLayout();
    const asset = result.passport.credentialSubject;
    return (
        <Container style={[styles.split, { paddingTop: compact ? 64 : 120, paddingBottom: compact ? 56 : 100 }]}>
            <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 400, gap: 14 }}>
                <Text style={t.caps}>{asset.brand.toUpperCase()}</Text>
                <PieceName parts={splitName(asset.name)} size={fluid(width, 56, 9, 132)} stacked style={{ lineHeight: fluid(width, 56, 9, 132) * 0.88 }} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <Badge label="Signature valide" />
                    <Text selectable style={[t.wide, { fontSize: 20, letterSpacing: 0.8 }]}>N° {number}</Text>
                </View>
                <Text style={t.small}>Inscrite au registre le {longDate(result.passport.validFrom)} par {result.passport.issuer.name}</Text>
                <SerialCheck assetId={asset.id} nonce={nonce} />
            </View>
            <View style={{ flexGrow: 1.25, flexShrink: 1, flexBasis: 480, borderTopWidth: 1, borderColor: color.ink }}>
                <Row label="Référence">
                    <Text selectable style={[t.ref, { fontSize: 17 }]}>{asset.reference}</Text>
                    <CopyButton value={asset.reference} what="la référence" />
                </Row>
                <Row label="Marque"><Value>{asset.brand}</Value></Row>
                <Row label="Modèle"><Value>{asset.model}</Value></Row>
                {SPEC_LABELS.map(([key, label]) => (asset.specs[key] ? <Row key={key} label={label}><Value>{asset.specs[key]!}</Value></Row> : null))}
                <Row label="Émise par"><Value>{result.passport.issuer.name}</Value></Row>
                <Row label="Propriétaire"><Value>Identité protégée</Value></Row>
            </View>
        </Container>
    );
}

/**
 * L'acheteur lit le numéro gravé sur la pièce et le compare à l'empreinte du passeport.
 * Le serveur ne répond que « correspond » ou non, 5 fois au plus pour ce QR (ADR-0005).
 */
function SerialCheck({ assetId, nonce }: { assetId: string; nonce: string }) {
    const [serial, setSerial] = useState('');
    const [busy, setBusy] = useState(false);
    const [answer, setAnswer] = useState<{ match: boolean } | { error: string } | null>(null);
    const compare = async () => {
        if (!serial.trim()) return;
        setBusy(true);
        try {
            const { data } = await api.post(`/assets/${assetId}/serial-check`, { nonce, serial });
            setAnswer(data);
        } catch (e) {
            const status = axios.isAxiosError(e) ? e.response?.status : undefined;
            setAnswer({
                error: status === 429
                    ? 'Nombre de contrôles atteint pour ce QR. Demandez-en un nouveau au vendeur.'
                    : status === 403
                        ? 'Le délai de 10 minutes est passé : vérifiez la pièce à nouveau.'
                        : 'Contrôle impossible pour le moment.',
            });
        } finally {
            setBusy(false);
        }
    };
    return (
        <View nativeID="serial" style={styles.serial}>
            <Text style={[t.body, t.strong]}>Le numéro de série correspond-il ?</Text>
            <Text style={t.small}>Il est gravé sur le boîtier. Certis ne le conserve pas en clair : il compare seulement son empreinte à celle du passeport.</Text>
            <TextField label="Numéro gravé sur la pièce" value={serial} onChangeText={setSerial} autoCapitalize="characters" onSubmitEditing={compare} />
            <Button label="Comparer" variant="secondary" loading={busy} onPress={compare} />
            {answer ? (
                <View accessibilityLiveRegion="polite">
                    {'match' in answer ? (
                        <Badge
                            label={answer.match ? 'Correspond au passeport' : 'Ne correspond pas au passeport'}
                            tone={answer.match ? 'verified' : 'refused'}
                        />
                    ) : (
                        <Text style={[t.small, { color: color.refused }]}>{answer.error}</Text>
                    )}
                </View>
            ) : null}
        </View>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Pressable tabIndex={-1} style={(s) => [styles.row, (s as { hovered?: boolean }).hovered && styles.rowHover, transition('background-color, padding')]}>
            <Text style={t.small}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>{children}</View>
        </Pressable>
    );
}

const Value = ({ children }: { children: string }) => <Text style={[t.body, { fontSize: 17, textAlign: 'right' }]}>{children}</Text>;

// Quatre couches, chacune réellement signée : passeport de l'émetteur, chaîne signée (ADR-0004, 0006).
const LAYERS = (result: Verification) => [
    { caps: 'LA PIÈCE', name: 'La pièce', desc: `Son passeport, signé par ${result.passport.issuer.name}.`, headline: result.passport.credentialSubject.name, mono: result.passport.credentialSubject.reference },
    { caps: 'LE PROPRIÉTAIRE', name: 'Le propriétaire', desc: 'Un compte Certis, sous pseudonyme.', headline: 'Propriétaire inscrit', mono: 'identité non divulguée' },
    {
        caps: 'L’HISTORIQUE', name: 'L’historique', desc: 'Chaque événement est chaîné au précédent.',
        headline: `${result.provenance.length} événement${result.provenance.length > 1 ? 's' : ''} chaînés`,
        mono: result.provenance.map((e) => shortDate(e.at).slice(0, 5)).join(' → '),
    },
    { caps: 'LA SIGNATURE', name: 'La signature', desc: 'Le sceau de l’émetteur et celui de Certis.', headline: 'Doublement scellé', mono: 'ECDSA P-256 · JCS' },
];

function Anatomy({ result, scrollY, top }: { result: Verification; scrollY: Animated.Value; top?: number }) {
    const { width, height, compact } = useLayout();
    const reduced = useReducedMotion();
    const [active, setActive] = useState(3);
    const layers = LAYERS(result);
    const S = compact ? Math.min(300, width - 60) : 390;
    const K = 0.62; // projection à l'écran d'un écart en profondeur (rotateX 56°)
    const lifts = useRef(layers.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        lifts.forEach((v, i) => {
            const to = i === active ? -36 * K : 0;
            if (reduced !== false) v.setValue(to);
            else Animated.timing(v, { toValue: to, duration: 500, easing: motion.ease, useNativeDriver: motion.native }).start();
        });
    }, [active, reduced, lifts]);

    // La pile s'éclate pendant que la section entre à l'écran.
    const gap = useMemo(
        () => (i: number) =>
            reduced !== false || top === undefined
                ? scrollY.interpolate({ inputRange: [0, 1], outputRange: [-84 * i * K + 126 * K, -84 * i * K + 126 * K] })
                : scrollY.interpolate({
                      inputRange: [top - height, top - height * 0.35],
                      outputRange: [-6 * i * K + 9 * K, -84 * i * K + 126 * K],
                      extrapolate: 'clamp',
                  }),
        [reduced, top, height, scrollY],
    );

    return (
        <Container style={[styles.split, { alignItems: 'center', paddingVertical: compact ? 64 : 110 }]}>
            <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 380, gap: 18 }}>
                <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { fontSize: fluid(width, 48, 6, 92), lineHeight: fluid(width, 48, 6, 92) * 0.92 }]}>
                    Anatomie <Text style={[t.italic, { color: color.seal }]}>d’un certificat</Text>
                </Text>
                <Text style={[t.lead, { maxWidth: 520 }]}>
                    Un certificat Certis n’est pas une image : ce sont quatre couches de données, scellées ensemble. Si une seule change, le sceau se brise.
                </Text>
                <View style={{ borderTopWidth: 1, borderColor: color.hairline, marginTop: 8 }}>
                    {layers.map((l, i) => (
                        <Pressable
                            key={l.caps}
                            onPress={() => setActive(i)}
                            onHoverIn={() => setActive(i)}
                            onFocus={() => setActive(i)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: i === active }}
                            style={styles.layerItem}
                        >
                            <Text style={[t.wide, { width: 28, fontSize: 13, color: i === active ? color.seal : color.slate }]}>0{i + 1}</Text>
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={[t.lead, t.strong]}>{l.name}</Text>
                                <Text style={[t.body, { color: color.slate }]}>{l.desc}</Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </View>
            <View aria-hidden nativeID="stack" style={{ flexGrow: 1.3, flexShrink: 1, flexBasis: compact ? 300 : 520, height: compact ? 380 : 560, alignItems: 'center', justifyContent: 'center' }}>
                {layers.map((l, i) => {
                    const on = i === active;
                    const seal = i === 3;
                    return (
                        <Animated.View
                            key={l.caps}
                            style={[
                                styles.layer,
                                {
                                    width: S,
                                    height: S * 0.64,
                                    padding: compact ? 14 : 20,
                                    backgroundColor: seal ? color.seal : color.card,
                                    borderColor: on ? color.gold : seal ? color.seal : color.hairline,
                                    boxShadow: on ? '0 30px 60px rgba(11,20,48,0.28)' : '0 10px 24px rgba(11,20,48,0.10)',
                                    transform: [
                                        { perspective: 1700 },
                                        { translateY: Animated.add(gap(i), lifts[i]) },
                                        { rotateX: '56deg' },
                                        { rotateZ: '-32deg' },
                                    ],
                                },
                                transition('border-color, box-shadow', 300),
                            ]}
                        >
                            <Text style={[t.caps, { fontSize: compact ? 10 : 12, letterSpacing: 2, color: seal ? color.paper : color.ink }]}>0{i + 1} · {l.caps}</Text>
                            <Text numberOfLines={1} style={[t.serif, { fontSize: compact ? 22 : 30, color: seal ? color.paper : color.ink }]}>{l.headline}</Text>
                            <Text style={[t.mono, { color: seal ? color.mist : color.slate }]}>{l.mono}</Text>
                        </Animated.View>
                    );
                })}
            </View>
        </Container>
    );
}

function Proof({ result }: { result: Verification }) {
    const { width, compact, wide } = useLayout();
    const [open, setOpen] = useState(false);
    const { proof } = result;
    const kid = (JSON.parse(atob(proof.passport.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))) as { kid: string }).kid;
    const head = proof.events[proof.events.length - 1]?.hash ?? '';
    const details = [
        { label: 'Signatures', value: 'ECDSA P-256 · SHA-256 (ES256)' },
        { label: 'Données signées', value: 'JSON canonique, RFC 8785' },
        { label: 'Clé de l’émetteur', value: `${kid.slice(0, 16)}…` },
        { label: 'Tête de chaîne', value: `${head.slice(0, 16)}…` },
    ];
    return (
        <View style={{ backgroundColor: color.night }}>
            <Container style={[styles.split, { paddingTop: compact ? 72 : 120, paddingBottom: compact ? 56 : 90 }]}>
                <View style={{ flexGrow: 1.2, flexShrink: 1, flexBasis: 480, gap: 20 }}>
                    <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { color: color.paper, fontSize: fluid(width, 48, 6.5, 104), lineHeight: fluid(width, 48, 6.5, 104) * 0.92 }]}>
                        Le cœur <Text style={[t.italic, { color: color.gold }]}>cryptographique</Text>
                    </Text>
                    <Text style={[t.lead, { color: color.mist, maxWidth: 560 }]}>
                        La maison qui a inscrit la pièce signe son passeport ; Certis signe chaque changement de mains. Chaque événement est chaîné au précédent : la moindre modification, même d’un seul caractère, rompt la chaîne.
                    </Text>
                    <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.disclosure}>
                        <Text style={[t.body, t.medium, { color: color.paper }]}>Détails techniques, pour les experts</Text>
                        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                            <Icon name="arrow" size={16} tone={color.gold} />
                        </View>
                    </Pressable>
                    {open ? (
                        <View style={{ gap: 10 }}>
                            {details.map((d) => (
                                <View key={d.label} style={styles.proofRow}>
                                    <Text style={[t.body, { color: color.mist }]}>{d.label}</Text>
                                    <Text selectable style={{ fontFamily: font.mono, fontSize: 14, color: color.paper }}>{d.value}</Text>
                                </View>
                            ))}
                            <Text style={[t.small, { color: color.mist }]}>
                                Vérifiable sans Certis : le fichier de preuve et la clé publique suffisent (outil libre tools/verify).
                            </Text>
                            {Platform.OS === 'web' ? (
                                <TextLink
                                    label="Télécharger la preuve (JSON)"
                                    tone={color.gold}
                                    onPress={() => downloadJson(`certis-preuve-${registryNumber(result.passport.credentialSubject.id).replace(/·/g, '-')}.json`, { passport: proof.passport, events: proof.events, anchors: proof.anchors })}
                                />
                            ) : null}
                        </View>
                    ) : null}
                </View>
                <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 380, gap: 18 }}>
                    <Text style={[t.lead, t.strong, { color: color.paper }]}>Avant de conclure</Text>
                    {CHECKS(result.passport.credentialSubject.reference).map((c) => (
                        <View key={c} style={{ flexDirection: 'row', gap: 10 }}>
                            <Text style={[t.body, { color: color.gold }]}>—</Text>
                            <Text style={[t.body, { color: color.paper, flex: 1 }]}>{c}</Text>
                        </View>
                    ))}
                    {wide && Platform.OS === 'web' ? (
                        <Button nativeID="print-proof" label="Imprimer le rapport" variant="light" arrow onPress={() => window.print()} style={{ marginTop: 8 }} />
                    ) : null}
                </View>
            </Container>
            <Container>
                <Text style={[t.small, styles.disclaimer]}>
                    Certis atteste l’intégrité de l’enregistrement de la pièce, vérifiable par tout acheteur sans compte. Il ne remplace pas l’expertise physique de la pièce.
                </Text>
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    navy: { backgroundColor: color.seal, overflow: 'hidden' },
    compactHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 24 },
    heroCard: {
        margin: 14, marginTop: space.lg, padding: 16, gap: 12, backgroundColor: color.paper,
        boxShadow: '0 18px 40px rgba(5,10,30,0.35)',
    },
    scan: { position: 'absolute', left: 0, right: 0, top: 0, height: 2 },
    wideNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 22, zIndex: 4 },
    widePiece: { position: 'absolute', top: 286, zIndex: 2 },
    wideFoot: { position: 'absolute', bottom: 56, left: 0, right: 0, zIndex: 3 },
    wideFootRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
    inspect: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
    ruled: { borderTopWidth: 1, borderColor: color.hairline },
    split: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 72, rowGap: 48 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 60, paddingVertical: 14, borderBottomWidth: 1, borderColor: color.hairline },
    rowHover: { backgroundColor: color.hover, paddingHorizontal: 14 },
    layerItem: { flexDirection: 'row', alignItems: 'baseline', gap: 16, minHeight: 64, paddingVertical: 14, borderBottomWidth: 1, borderColor: color.hairline },
    layer: { position: 'absolute', justifyContent: 'space-between', borderWidth: 1 },
    event: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 28, rowGap: 6, paddingVertical: 22, borderBottomWidth: 1, borderColor: color.hairline },
    disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
    proofRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 16, rowGap: 6, paddingBottom: 10, borderBottomWidth: 1, borderColor: 'rgba(174,184,214,0.25)' },
    serial: { gap: 10, marginTop: 14, padding: 16, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.card },
    disclaimer: { color: color.mist, paddingTop: 24, paddingBottom: 48, borderTopWidth: 1, borderColor: 'rgba(174,184,214,0.25)' },
});
