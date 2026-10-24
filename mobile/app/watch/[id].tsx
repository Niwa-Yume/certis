import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import api from '../../lib/api';
import { registryNumber, shortDate, splitName } from '../../lib/format';
import { type Photo, WatchVisual, usePhoto } from '../../components/WatchPhoto';
import NonceSheet from '../../components/NonceSheet';
import {
    Badge, Button, CopyButton, Glow, Icon, IconButton, PieceName, Rise, Spinner, TrackIn, Wordmark,
    t, transition, useLayout, useReducedMotion,
} from '../../components/ui';
import { color, motion, space } from '../../theme/tokens';

type Watch = {
    id: string; name: string; brand: string; model: string; reference: string;
    ownerId: string; signature: string; imageUrl?: string | null; createdAt: string;
};
type Transfer = { id: string; toOwnerId: string; createdAt: string };
type Loaded = { watch: Watch; history: Transfer[]; valid: boolean | null };
type Tab = 'fiche' | 'provenance' | 'preuve';

const TABS: { id: Tab; label: string }[] = [
    { id: 'fiche', label: 'Fiche' },
    { id: 'provenance', label: 'Provenance' },
    { id: 'preuve', label: 'Preuve' },
];

export default function WatchScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { wide, width, height } = useLayout();
    const [data, setData] = useState<Loaded | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('fiche');
    const [pinned, setPinned] = useState(false);
    const [sheet, setSheet] = useState<'verify' | 'transfer' | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const [watch, history] = await Promise.all([api.get(`/assets/${id}`), api.get(`/assets/${id}/history`)]);
            // La vérification d'intégrité ne doit pas empêcher d'afficher la pièce.
            const valid = await api.get(`/assets/${id}/verify`).then((r) => Boolean(r.data.valid), () => null);
            setData({ watch: watch.data, history: history.data, valid });
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401) return router.replace('/login');
            setError(axios.isAxiosError(e) && e.response?.status === 404
                ? 'Cette pièce ne figure pas dans votre collection.'
                : 'Serveur injoignable. Vérifiez votre connexion.');
        }
    }, [id, router]);

    useEffect(() => { load(); }, [load]);

    const back = () => (router.canGoBack() ? router.back() : router.replace('/dashboard'));
    const { photo, onError } = usePhoto(data?.watch.reference ?? '', data?.watch.imageUrl);

    if (!data) {
        return (
            <View style={styles.center}>
                {error ? (
                    <View style={{ gap: space.md, maxWidth: 420, padding: space.lg }}>
                        <Text style={t.lead}>{error}</Text>
                        <Button label="Réessayer" onPress={load} />
                        <Button label="Retour à la collection" variant="secondary" onPress={() => router.replace('/dashboard')} />
                    </View>
                ) : (
                    <Spinner size={72} track={color.hairline} />
                )}
            </View>
        );
    }

    const { watch } = data;
    const word = watch.model.toUpperCase();
    const label = `${watch.brand} ${watch.name}, référence ${watch.reference}`;
    const details = <Details data={data} tab={tab} onTab={setTab} big={wide} />;

    if (wide) {
        const heroH = Math.max(640, height);
        const boxH = Math.min(612, heroH * 0.7);
        return (
            <View style={styles.row}>
                <Hero
                    style={{ flex: 1.1, height: heroH }}
                    word={word}
                    wordSize={Math.min(150, (width * 0.5) / (word.length * 0.8))}
                    wordTop={heroH * 0.36}
                    photo={photo} onError={onError} label={label}
                    box={{ width: boxH * 0.556, height: boxH, top: (heroH - boxH) / 2 + 20 }}
                    lens={170} zoom={2.4}
                    pinned={pinned} onPin={() => setPinned((p) => !p)}
                />
                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.wideColumn}>
                    <Pressable onPress={back} accessibilityRole="link" style={styles.backLink}>
                        <Icon name="back" size={18} />
                        <Text style={[t.body, t.medium]}>Ma collection</Text>
                    </Pressable>
                    <Rise delay={350} distance={24}>{details}</Rise>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xl }}>
                        <Button label="Présenter pour vérification" arrow onPress={() => setSheet('verify')} style={{ flexGrow: 1 }} />
                        <Button label="Céder la pièce" variant="secondary" onPress={() => setSheet('transfer')} />
                    </View>
                </ScrollView>
                <NonceSheet kind={sheet} assetId={watch.id} onClose={() => setSheet(null)} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
                <Hero
                    style={{ height: 452 }}
                    word={word}
                    wordSize={Math.min(68, (width - 24) / (word.length * 0.8))}
                    wordTop={168}
                    photo={photo} onError={onError} label={label}
                    box={{ width: 183, height: 330, top: 56 }}
                    pinned={pinned} onPin={() => setPinned((p) => !p)}
                    onBack={back}
                />
                <Rise delay={350} distance={40} style={styles.sheet}>
                    <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}>{details}</View>
                </Rise>
            </ScrollView>
            <View style={styles.actionBar}>
                <Button label="Présenter pour vérification" arrow onPress={() => setSheet('verify')} style={{ flex: 1 }} />
                <IconButton icon="transfer" label="Céder la pièce" bordered onPress={() => setSheet('transfer')} />
            </View>
            <NonceSheet kind={sheet} assetId={watch.id} onClose={() => setSheet(null)} />
        </View>
    );
}

function Hero({ style, word, wordSize, wordTop, photo, onError, label, box, lens, zoom, pinned, onPin, onBack }: {
    style: object; word: string; wordSize: number; wordTop: number; photo: Photo | null; onError: () => void; label: string;
    box: { width: number; height: number; top: number }; lens?: number; zoom?: number; pinned: boolean; onPin: () => void; onBack?: () => void;
}) {
    return (
        <View style={[styles.hero, style]}>
            <Glow />
            <View style={styles.heroHeader}>
                {onBack ? <IconButton icon="back" label="Retour à la collection" tone={color.paper} onPress={onBack} /> : null}
                <View style={onBack ? styles.wordmarkCentered : { paddingLeft: space.xl, paddingTop: space.md }}>
                    <Wordmark tone={color.paper} />
                </View>
            </View>
            <View aria-hidden style={[styles.giantWord, { top: wordTop }]}>
                <TrackIn size={wordSize} opacity={0.9} style={[t.wide, { color: color.paper, textAlign: 'center' }]}>{word}</TrackIn>
            </View>
            <Rise delay={150} distance={28} scale={0.97} duration={1000} style={[styles.photo, { top: box.top }]}>
                <WatchVisual photo={photo} onError={onError} label={label} width={box.width} height={box.height} lens={lens} zoom={zoom} pinned={pinned} />
            </Rise>
            {photo ? (
                <Pressable
                    onPress={onPin}
                    accessibilityRole="togglebutton"
                    accessibilityState={{ checked: pinned }}
                    style={styles.inspect}
                >
                    <Icon name="loupe" size={16} tone={color.mist} />
                    <Text style={[t.mono, { color: color.mist }]}>{pinned ? 'Fermer la loupe' : 'Inspecter le cadran'}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

function Details({ data, tab, onTab, big }: { data: Loaded; tab: Tab; onTab: (t: Tab) => void; big: boolean }) {
    const { watch, history, valid } = data;
    return (
        <View style={{ gap: space.md }}>
            <View style={{ gap: 6 }}>
                <Text style={t.caps}>{watch.brand.toUpperCase()}</Text>
                <PieceName parts={splitName(watch.name)} size={big ? 72 : 46} />
                <View style={styles.badgeRow}>
                    {valid === true ? <Badge label="Certificat intact" /> : null}
                    {valid === false ? <Badge label="Certificat altéré" tone="refused" /> : null}
                    <Text selectable style={[t.mono, { fontSize: 14 }]}>N° {registryNumber(watch.id)}</Text>
                </View>
            </View>

            <Tabs value={tab} onChange={onTab} />

            {tab === 'fiche' ? (
                <View accessibilityRole="summary">
                    <Row label="Référence">
                        <Text selectable style={[t.ref, { fontSize: 15 }]}>{watch.reference}</Text>
                        <CopyButton value={watch.reference} what="la référence" />
                    </Row>
                    <Row label="Marque"><Value>{watch.brand}</Value></Row>
                    <Row label="Modèle"><Value>{watch.model}</Value></Row>
                    <Row label="Inscrite au registre"><Value>{shortDate(watch.createdAt)}</Value></Row>
                </View>
            ) : null}

            {tab === 'provenance' ? (
                <View>
                    <Event date={watch.createdAt} label="Inscription au registre" />
                    {history.map((h, i) => (
                        <Event
                            key={h.id}
                            date={h.createdAt}
                            label={i === history.length - 1 && h.toOwnerId === watch.ownerId ? 'Reçue par vous' : 'Changement de propriétaire'}
                        />
                    ))}
                </View>
            ) : null}

            {tab === 'preuve' ? <Proof valid={valid} signature={watch.signature} /> : null}
        </View>
    );
}

function Tabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
    const [width, setWidth] = useState(0);
    const reduced = useReducedMotion();
    const x = useRef(new Animated.Value(0)).current;
    const index = TABS.findIndex((tab) => tab.id === value);

    useEffect(() => {
        const to = (index * width) / TABS.length;
        if (reduced !== false) return x.setValue(to);
        Animated.timing(x, { toValue: to, duration: 350, easing: motion.ease, useNativeDriver: motion.native }).start();
    }, [index, width, reduced, x]);

    return (
        <View accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.tabs}>
            {TABS.map((tab) => {
                const selected = tab.id === value;
                return (
                    <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(tab.id)} style={styles.tab}>
                        <Text style={[t.body, selected ? [t.strong, { color: color.ink }] : { color: color.slate }]}>{tab.label}</Text>
                    </Pressable>
                );
            })}
            <Animated.View style={[styles.indicator, { width: width / TABS.length, transform: [{ translateX: x }] }]} />
        </View>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Pressable style={(s) => [styles.rowItem, (s as { hovered?: boolean }).hovered && styles.rowHover, transition('background-color, padding')]}>
            <Text style={[t.small, { flexShrink: 0 }]}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 }}>{children}</View>
        </Pressable>
    );
}

const Value = ({ children }: { children: string }) => <Text style={[t.body, t.medium, { textAlign: 'right' }]}>{children}</Text>;

function Event({ date, label }: { date: string; label: string }) {
    return (
        <View style={styles.event}>
            <Text style={[t.wide, { width: 104, fontSize: 14 }]}>{shortDate(date)}</Text>
            <Text style={[t.body, { flex: 1 }]}>{label}</Text>
        </View>
    );
}

function Proof({ valid, signature }: { valid: boolean | null; signature: string }) {
    const [open, setOpen] = useState(false);
    const text = valid === true
        ? 'Certificat intact : la signature numérique correspond aux données de la pièce.'
        : valid === false
            ? 'Certificat altéré : les données ne correspondent plus à la signature. Contactez Certis avant toute transaction.'
            : 'Vérification indisponible pour le moment. Réessayez plus tard.';
    return (
        <View style={{ gap: space.sm }}>
            <Text style={t.body}>{text}</Text>
            <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.disclosure}>
                <Text style={[t.body, t.medium, { color: color.seal }]}>Détails techniques</Text>
                <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                    <Icon name="arrow" size={16} tone={color.seal} />
                </View>
            </Pressable>
            {open ? (
                <View style={{ gap: 6 }}>
                    <Text style={[t.mono, { color: color.ink }]}>ECDSA P-256 · SHA-256</Text>
                    <Text style={[t.mono, { color: color.ink }]}>JCS (RFC 8785) · format v1</Text>
                    <Text selectable style={[t.mono, { color: color.ink }]}>{signature.slice(0, 12)}…{signature.slice(-12)}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: color.paper },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
    row: { flex: 1, flexDirection: 'row', backgroundColor: color.paper },
    hero: { backgroundColor: color.seal, overflow: 'hidden' },
    heroHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingHorizontal: 10, zIndex: 3 },
    wordmarkCentered: { position: 'absolute', left: 0, right: 0, top: 10, height: 48, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
    giantWord: { position: 'absolute', left: 0, right: 0, zIndex: 1 },
    photo: { position: 'absolute', alignSelf: 'center', zIndex: 2 },
    inspect: { position: 'absolute', left: 14, bottom: 30, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, zIndex: 3 },
    sheet: { marginTop: -24, backgroundColor: color.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 20 },
    wideColumn: { paddingHorizontal: 56, paddingVertical: 40, maxWidth: 640, gap: space.lg },
    backLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start', marginBottom: space.lg },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: color.hairline },
    tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    indicator: { position: 'absolute', bottom: -1, left: 0, height: 2, backgroundColor: color.seal },
    rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 56, paddingVertical: 12, borderBottomWidth: 1, borderColor: color.hairline },
    rowHover: { backgroundColor: color.hover, paddingHorizontal: 14 },
    event: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: color.hairline },
    disclosure: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
    actionBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 8,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22, backgroundColor: color.paper, borderTopWidth: 1, borderColor: color.hairline,
    },
});
