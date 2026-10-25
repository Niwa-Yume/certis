import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import api, { explain } from '../../lib/api';
import { registryNumber, shortDate, splitName } from '../../lib/format';
import { type EventType, SPEC_LABELS, type Specs, describeEvent, downloadJson } from '../../lib/registry';
import { type Photo, WatchVisual, usePhoto } from '../../components/WatchPhoto';
import NonceSheet from '../../components/NonceSheet';
import {
    Badge, Button, CopyButton, Glow, Icon, IconButton, Notice, PieceName, Rise, Spinner, TextLink, TrackIn, Wordmark,
    t, transition, useLayout, useReducedMotion,
} from '../../components/ui';
import { color, motion, space } from '../../theme/tokens';

type Watch = {
    id: string; name: string; brand: string; model: string; reference: string; status: string;
    imageUrl: string | null; imageCutout: boolean; specs: Specs; issuer: { id: string; name: string }; trial: boolean;
    provenance: { seq: number; type: EventType; at: string; note?: string; you: boolean }[];
};
// valid : passeport, chaîne et base concordent (null si la vérification n'a pas pu tourner).
type Loaded = { watch: Watch; valid: boolean | null };
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
            const watch = await api.get(`/assets/${id}`);
            // La vérification d'intégrité ne doit pas empêcher d'afficher la pièce.
            const valid = await api.get(`/assets/${id}/verify`).then((r) => Boolean(r.data.valid), () => null);
            setData({ watch: watch.data, valid });
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401) return router.replace('/login');
            setError(explain(e, 'Pièce indisponible : réessayez dans un instant.'));
        }
    }, [id, router]);

    useEffect(() => { load(); }, [load]);

    const back = () => (router.canGoBack() ? router.back() : router.replace('/dashboard'));
    const { photo, onError } = usePhoto(data?.watch.imageUrl, data?.watch.imageCutout);

    if (!data) {
        return (
            <View style={styles.center}>
                {error ? (
                    <View style={{ gap: space.md, maxWidth: 420, padding: space.lg }}>
                        <Notice message={error} />
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
    const stolen = watch.status === 'STOLEN';
    const details = <Details data={data} tab={tab} onTab={setTab} big={wide} onChange={load} />;

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
                        {stolen ? null : <Button label="Céder la pièce" variant="secondary" onPress={() => setSheet('transfer')} />}
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
                {stolen ? null : <IconButton icon="transfer" label="Céder la pièce" bordered onPress={() => setSheet('transfer')} />}
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
                    accessibilityRole="button"
                    style={styles.inspect}
                >
                    <Icon name="loupe" size={16} tone={color.mist} />
                    <Text style={[t.mono, { color: color.mist }]}>{pinned ? 'Fermer la loupe' : 'Inspecter le cadran'}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

function Details({ data, tab, onTab, big, onChange }: { data: Loaded; tab: Tab; onTab: (t: Tab) => void; big: boolean; onChange: () => void }) {
    const { watch, valid } = data;
    const minted = watch.provenance[0]?.at;
    return (
        <View style={{ gap: space.md }}>
            <View style={{ gap: 6 }}>
                <Text style={t.caps}>{watch.brand.toUpperCase()}</Text>
                <PieceName parts={splitName(watch.name)} size={big ? 72 : 46} />
                <View style={styles.badgeRow}>
                    {watch.trial ? <Badge label="Pièce d’essai" tone="info" /> : null}
                    {watch.status === 'STOLEN' ? <Badge label="Déclarée volée" tone="refused" /> : null}
                    {valid === true ? <Badge label="Certificat intact" /> : null}
                    {valid === false ? <Badge label="Certificat altéré" tone="refused" /> : null}
                    <Text selectable style={[t.mono, { fontSize: 14 }]}>N° {registryNumber(watch.id)}</Text>
                </View>
            </View>

            {watch.trial ? (
                <Notice
                    tone="info"
                    message="Pièce d’essai : elle ne vaut pour aucune montre réelle, essayez tout sans risque. Présentez-la pour vérification et ouvrez le lien comme un acheteur ; cédez-la à un autre compte ; déclarez-la volée, puis retrouvée. Son numéro gravé, pour le contrôle de l’acheteur : ESSAI-0001."
                />
            ) : null}

            <Tabs value={tab} onChange={onTab} />

            {tab === 'fiche' ? (
                <View accessibilityRole="summary">
                    <Row label="Référence">
                        <Text selectable style={[t.ref, { fontSize: 15 }]}>{watch.reference}</Text>
                        <CopyButton value={watch.reference} what="la référence" />
                    </Row>
                    <Row label="Marque"><Value>{watch.brand}</Value></Row>
                    <Row label="Modèle"><Value>{watch.model}</Value></Row>
                    {/* Seulement ce que l'émetteur a renseigné (ADR-0009). */}
                    {SPEC_LABELS.map(([key, label]) => (watch.specs[key] ? <Row key={key} label={label}><Value>{watch.specs[key]!}</Value></Row> : null))}
                    <Row label="Émise par"><Value>{watch.issuer.name}</Value></Row>
                    {minted ? <Row label="Inscrite au registre"><Value>{shortDate(minted)}</Value></Row> : null}
                </View>
            ) : null}

            {tab === 'provenance' ? (
                <View>
                    {watch.provenance.map((e) => (
                        <Event key={e.seq} date={e.at} {...describeEvent(e.type, { issuer: watch.issuer.name, note: e.note, you: e.you })} />
                    ))}
                </View>
            ) : null}

            {tab === 'preuve' ? <Proof watch={watch} valid={valid} /> : null}

            <Theft watch={watch} onChange={onChange} />
        </View>
    );
}

/** Déclaration de vol puis de restitution, en deux temps pour éviter l'erreur (ADR-0006). */
function Theft({ watch, onChange }: { watch: Watch; onChange: () => void }) {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const stolen = watch.status === 'STOLEN';
    const declare = async () => {
        setBusy(true);
        setError(null);
        try {
            await api.post(`/assets/${watch.id}/${stolen ? 'recovered' : 'stolen'}`);
            setConfirming(false);
            onChange();
        } catch (e) {
            setError(explain(e, 'Déclaration impossible pour le moment : réessayez dans un instant.'));
        } finally {
            setBusy(false);
        }
    };
    const since = [...watch.provenance].reverse().find((e) => e.type === 'STOLEN_REPORTED')?.at;

    if (stolen) {
        return (
            <View accessibilityLiveRegion="polite" style={styles.alert}>
                <Text style={[t.body, t.strong, { color: color.refused }]}>Déclarée volée{since ? ` le ${shortDate(since)}` : ''}</Text>
                <Text style={t.body}>Elle ne peut pas changer de propriétaire, et toute vérification affiche l’alerte à l’acheteur.</Text>
                <Button label="Déclarer retrouvée" variant="secondary" loading={busy} onPress={declare} />
                {error ? <Notice message={error} /> : null}
            </View>
        );
    }
    return confirming ? (
        <View style={styles.alert}>
            <Text style={t.body}>La pièce sera bloquée : aucune cession possible, et chaque vérification signalera le vol. Vous pourrez la déclarer retrouvée.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                <Button label="Confirmer : déclarer volée" loading={busy} onPress={declare} />
                <Button label="Annuler" variant="secondary" onPress={() => setConfirming(false)} />
            </View>
            {error ? <Notice message={error} /> : null}
        </View>
    ) : (
        <TextLink label="Pièce perdue ou volée ? La déclarer" tone={color.refused} onPress={() => setConfirming(true)} />
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
        <Pressable tabIndex={-1} style={(s) => [styles.rowItem, (s as { hovered?: boolean }).hovered && styles.rowHover, transition('background-color, padding')]}>
            <Text style={[t.small, { flexShrink: 0 }]}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 }}>{children}</View>
        </Pressable>
    );
}

const Value = ({ children }: { children: string }) => <Text style={[t.body, t.medium, { textAlign: 'right' }]}>{children}</Text>;

function Event({ date, label, note }: { date: string; label: string; note?: string }) {
    return (
        <View style={styles.event}>
            <Text style={[t.wide, { width: 104, fontSize: 14 }]}>{shortDate(date)}</Text>
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={t.body}>{label}</Text>
                {note ? <Text style={t.small}>{note}</Text> : null}
            </View>
        </View>
    );
}

function Proof({ watch, valid }: { watch: Watch; valid: boolean | null }) {
    const [open, setOpen] = useState(false);
    const text = valid === true
        ? `Certificat intact : le passeport signé par ${watch.issuer.name} et la chaîne de ses ${watch.provenance.length} événements concordent.`
        : valid === false
            ? 'Certificat altéré : le registre ne concorde plus avec ses signatures. Contactez Certis avant toute transaction.'
            : 'Vérification indisponible pour le moment. Réessayez plus tard.';
    // Pour un expert : le fichier que lit le vérificateur indépendant (tools/verify), sans Certis.
    const download = async () => {
        const { data } = await api.get(`/assets/${watch.id}/history`);
        downloadJson(`certis-preuve-${registryNumber(watch.id).replace(/·/g, '-')}.json`, data);
    };
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
                    <Text style={[t.mono, { color: color.ink }]}>Passeport : JWS ES256, signé par {watch.issuer.name}</Text>
                    <Text style={[t.mono, { color: color.ink }]}>Chaîne : {watch.provenance.length} maillons, JCS (RFC 8785) + SHA-256</Text>
                    <Text style={[t.mono, { color: color.ink }]}>Clés publiques : /.well-known/certis-keys</Text>
                    {Platform.OS === 'web' ? <TextLink label="Télécharger la preuve (JSON)" onPress={download} /> : null}
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
    alert: { gap: space.sm, padding: space.md, borderWidth: 1, borderColor: color.refused, backgroundColor: color.card },
    actionBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 8,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22, backgroundColor: color.paper, borderTopWidth: 1, borderColor: color.hairline,
    },
});
