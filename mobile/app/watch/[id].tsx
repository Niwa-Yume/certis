import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import api, { explain, stateOf } from '../../lib/api';
import { tr } from '../../lib/i18n';
import { longDate, monthYear, registryNumber, shortDate, splitName } from '../../lib/format';
import { type EventType, SPEC_LABELS, type Specs, describeEvent, downloadJson } from '../../lib/registry';
import { NoPhoto, usePhoto } from '../../components/WatchPhoto';
import NonceSheet from '../../components/NonceSheet';
import FaceLine, { type Face } from '../../components/Face';
import Handover from '../../components/Handover';
import { Button, CopyButton, Icon, IconButton, Notice, PieceName, State, TextLink, t, transition, useLayout } from '../../components/ui';
import { color, space, typeScale } from '../../theme/tokens';

type Watch = {
    id: string; name: string; brand: string; model: string; reference: string; status: string;
    imageUrl: string | null; imageCutout: boolean; specs: Specs; issuer: { id: string; name: string }; trial: boolean;
    provenance: { seq: number; type: EventType; at: string; note?: string; you: boolean }[];
    issuedBy: Face | null; story: string | null; links: { label: string; url: string }[];
    // pending : promise à ce compte, encore à la maison ; cardId : la carte, pour son détenteur.
    pending: boolean; cardId: string | null;
};
// valid : passeport, chaîne et base concordent (null si la vérification n'a pas pu tourner).
type Loaded = { watch: Watch; valid: boolean | null; house: boolean };

// Révision conseillée tous les cinq ans, comptés depuis la dernière intervention de la maison.
const SERVICE_YEARS = 5;

/**
 * Écran 4, la fiche de vie : la pièce, la personne qui l'a émise, son histoire en phrases, la
 * référence, la prochaine révision, la maison. Les preuves viennent en dernier, repliées.
 */
export default function WatchScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { wide, height, gutter } = useLayout();
    const [data, setData] = useState<Loaded | null>(null);
    const [failure, setFailure] = useState<unknown>(null);
    const [sheet, setSheet] = useState<'verify' | 'transfer' | null>(null);

    const load = useCallback(async () => {
        setFailure(null);
        try {
            const [watch, me] = await Promise.all([api.get(`/assets/${id}`), api.get('/auth/me')]);
            // La vérification d'intégrité ne doit pas empêcher d'afficher la pièce.
            const valid = watch.data.pending ? null : await api.get(`/assets/${id}/verify`).then((r) => Boolean(r.data.valid), () => null);
            // La maison qui détient la pièce dans son stock : elle peut inviter le client et la lui remettre.
            const house = !watch.data.pending && me.data.issuer?.id === watch.data.issuer.id;
            setData({ watch: watch.data, valid, house });
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401) return router.replace('/login');
            setFailure(e);
        }
    }, [id, router]);

    useEffect(() => { load(); }, [load]);

    const back = () => (router.canGoBack() ? router.back() : router.replace('/dashboard'));
    const { photo, onError } = usePhoto(data?.watch.imageUrl, data?.watch.imageCutout);

    if (!data) {
        return (
            <View style={styles.center}>
                {failure ? (
                    <State kind={stateOf(failure)} action={{ label: tr.retry, onPress: load }} />
                ) : (
                    <State kind="loading" />
                )}
            </View>
        );
    }

    const { watch } = data;
    const stolen = watch.status === 'STOLEN';
    const pending = watch.pending;

    // La photo occupe au moins la moitié du premier écran : 55 % de la hauteur sur mobile, la moitié gauche sur ordinateur.
    const hero = (
        <View style={[styles.hero, wide ? { width: '50%', height: '100%' } : { height: Math.max(360, Math.round(height * 0.55)) }]}>
            <View accessible accessibilityRole="image" accessibilityLabel={`${watch.brand} ${watch.name}`} style={StyleSheet.absoluteFill}>
                {photo ? (
                    <Image source={photo.source} onError={onError} resizeMode={photo.cutout ? 'contain' : 'cover'} style={StyleSheet.absoluteFill} />
                ) : (
                    <NoPhoto />
                )}
            </View>
            {/* Hors de l'image : un bouton ne se niche pas dans un élément non interactif (axe). */}
            {wide ? null : (
                <View style={styles.backOnPhoto}>
                    <IconButton icon="back" label={tr.piece.back} tone={color.onDeep} onPress={back} />
                </View>
            )}
        </View>
    );

    const actions = (
        <View style={[styles.actions, wide ? null : styles.actionBar]}>
            <Button label={tr.piece.present} arrow onPress={() => setSheet('verify')} style={{ flex: 1 }} />
            {stolen ? null : wide ? (
                <Button label={tr.piece.transfer} variant="secondary" onPress={() => setSheet('transfer')} />
            ) : (
                <IconButton icon="transfer" label={tr.piece.transfer} bordered onPress={() => setSheet('transfer')} />
            )}
        </View>
    );

    const content = (
        <View style={[styles.content, { padding: gutter, paddingBottom: wide || pending ? gutter : 120 }]}>
            {wide ? (
                <Pressable onPress={back} accessibilityRole="link" style={styles.backLink}>
                    <Icon name="back" size={18} />
                    <Text style={[t.body, t.medium]}>{tr.piece.back}</Text>
                </Pressable>
            ) : null}
            <Life data={data} title={wide ? typeScale.display : typeScale.title} onChange={load} />
            {wide && !pending ? actions : null}
        </View>
    );

    return (
        <View style={[styles.screen, wide ? { flexDirection: 'row' } : null]}>
            {wide ? (
                <>
                    {hero}
                    <ScrollView style={{ flex: 1 }}>{content}</ScrollView>
                </>
            ) : (
                <>
                    <ScrollView>
                        {hero}
                        {content}
                    </ScrollView>
                    {pending ? null : actions}
                </>
            )}
            <NonceSheet kind={sheet} assetId={watch.id} onClose={() => setSheet(null)} />
        </View>
    );
}

function Life({ data, title, onChange }: { data: Loaded; title: number; onChange: () => void }) {
    const { watch } = data;
    const stolen = watch.status === 'STOLEN';
    const mint = watch.provenance.find((e) => e.type === 'MINT');
    const services = watch.provenance.filter((e) => e.type === 'SERVICE');
    const transfers = watch.provenance.filter((e) => e.type === 'TRANSFER').length;
    const last = services[services.length - 1]?.at ?? mint?.at;
    const next = last ? new Date(new Date(last).setFullYear(new Date(last).getFullYear() + SERVICE_YEARS)).toISOString() : null;

    // Le récit d'abord, en phrases ; la chronologie le détaille juste en dessous.
    const story = [
        mint ? tr.piece.storyLine(watch.issuer.name, longDate(mint.at)) : '',
        services.length ? tr.piece.services(services.length, longDate(services[services.length - 1].at)) : '',
        transfers ? tr.piece.owners(transfers) : '',
    ].filter(Boolean).join(' ');

    return (
        <View style={{ gap: space.lg }}>
            <View style={{ gap: space.sm }}>
                <View style={styles.top}>
                    <Text style={[t.caps, { flexShrink: 1 }]}>{watch.brand} · {watch.reference}</Text>
                    <Text style={[t.caps, { color: stolen ? color.refused : color.ink }]}>
                        {watch.pending ? tr.handover.status : tr.piece.status[stolen ? 'STOLEN' : watch.trial ? 'TRIAL' : 'ACTIVE']}
                    </Text>
                </View>
                <PieceName parts={splitName(watch.name, watch.model)} size={title} />
            </View>

            {watch.issuedBy ? <FaceLine face={watch.issuedBy} house={watch.issuer.name} /> : null}
            {watch.trial ? <Notice tone="info" message={tr.piece.trialNote} /> : null}
            {watch.pending ? <Notice tone="info" message={tr.handover.waiting(watch.issuer.name)} /> : null}
            {data.house ? <Handover assetId={watch.id} cardId={watch.cardId} /> : null}
            {/* Volée : le fait daté et le geste pour la déclarer retrouvée, avant tout le reste. */}
            {stolen ? <Theft watch={watch} onChange={onChange} /> : null}

            <Section title={tr.piece.story}>
                {story ? <Text style={t.body}>{story}</Text> : null}
                {watch.provenance.map((e) => {
                    const d = describeEvent(e.type, { issuer: watch.issuer.name, note: e.note, you: e.you });
                    return (
                        <View key={e.seq} style={styles.event}>
                            <Text style={[t.mono, styles.date]}>{shortDate(e.at)}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={t.body}>{d.label}</Text>
                                {d.note ? <Text style={t.small}>{d.note}</Text> : null}
                            </View>
                        </View>
                    );
                })}
            </Section>

            {watch.story ? (
                <Section title={tr.piece.reference}>
                    <Text style={t.body}>{watch.story}</Text>
                </Section>
            ) : null}

            {next && !stolen ? (
                <Section title={tr.piece.nextService}>
                    <Text style={t.body}>{tr.piece.nextServiceBody(monthYear(next))}</Text>
                </Section>
            ) : null}

            {watch.links.length ? (
                <Section title={tr.piece.house}>
                    {watch.links.map((link) => (
                        <TextLink key={link.url} label={link.label} onPress={() => Linking.openURL(link.url)} />
                    ))}
                </Section>
            ) : null}

            <Section title={tr.piece.specs}>
                <Row label={tr.spec.reference}>
                    <Text selectable style={[t.body, t.medium]}>{watch.reference}</Text>
                    <CopyButton value={watch.reference} what={tr.spec.reference} />
                </Row>
                {SPEC_LABELS.map(([key, label]) => (watch.specs[key] ? (
                    <Row key={key} label={label}><Text style={[t.body, { textAlign: 'right', flexShrink: 1 }]}>{watch.specs[key]}</Text></Row>
                ) : null))}
            </Section>

            {watch.pending ? null : <Proofs data={data} />}
            {stolen || watch.pending ? null : <Theft watch={watch} onChange={onChange} />}
        </View>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={styles.section}>
            <Text accessibilityRole="header" style={t.caps}>{title}</Text>
            {children}
        </View>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <View style={styles.row}>
            <Text style={t.small}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 }}>{children}</View>
        </View>
    );
}

/** Le volet technique, fermé par défaut : intégrité, n° d'inscription, fichier de preuve. */
function Proofs({ data }: { data: Loaded }) {
    const [open, setOpen] = useState(false);
    const { watch, valid } = data;
    const text = valid === true ? tr.piece.intact : valid === false ? tr.piece.altered : tr.piece.unknown;
    // Pour un expert : le fichier que lit le vérificateur indépendant (tools/verify), sans Certis.
    const download = async () => {
        const { data: proof } = await api.get(`/assets/${watch.id}/history`);
        downloadJson(`certis-preuve-${registryNumber(watch.id).replace(/·/g, '-')}.json`, proof);
    };
    return (
        <View style={styles.section}>
            <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.disclosure}>
                <View style={{ flex: 1 }}>
                    <Text style={[t.body, t.strong]}>{tr.piece.proofs}</Text>
                    <Text style={t.small}>{tr.verify.proofsHint}</Text>
                </View>
                <View style={[{ transform: [{ rotate: open ? '90deg' : '0deg' }] }, transition('transform', 200)]}>
                    <Icon name="arrow" size={18} />
                </View>
            </Pressable>
            {open ? (
                <View style={{ gap: space.md }}>
                    <Text style={[t.body, valid === false ? { color: color.refused } : null]}>{text}</Text>
                    <Row label={tr.verify.registry}><Text selectable style={[t.mono, { color: color.ink }]}>{registryNumber(watch.id)}</Text></Row>
                    <Text style={t.small}>{tr.piece.independent}</Text>
                    {Platform.OS === 'web' ? <TextLink label={tr.piece.download} onPress={download} /> : null}
                </View>
            ) : null}
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
            setError(explain(e, tr.piece.reportFailed));
        } finally {
            setBusy(false);
        }
    };
    const since = [...watch.provenance].reverse().find((e) => e.type === 'STOLEN_REPORTED')?.at;

    if (stolen) {
        return (
            <View accessibilityLiveRegion="polite" style={styles.alert}>
                <Text style={[t.body, t.strong, { color: color.refused }]}>{tr.piece.stolenSince(since ? longDate(since) : '')}</Text>
                <Text style={t.body}>{tr.piece.stolenBody}</Text>
                <Button label={tr.piece.recover} variant="secondary" loading={busy} onPress={declare} />
                {error ? <Notice message={error} /> : null}
            </View>
        );
    }
    return confirming ? (
        <View style={styles.alert}>
            <Text style={t.body}>{tr.piece.reportBody}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                <Button label={tr.piece.reportConfirm} loading={busy} onPress={declare} />
                <Button label={tr.piece.cancel} variant="secondary" onPress={() => setConfirming(false)} />
            </View>
            {error ? <Notice message={error} /> : null}
        </View>
    ) : (
        <TextLink label={tr.piece.report} tone={color.refused} onPress={() => setConfirming(true)} />
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: color.paper },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
    hero: { backgroundColor: color.deep, overflow: 'hidden' },
    backOnPhoto: { position: 'absolute', top: space.sm, left: space.sm, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 24 },
    content: { width: '100%', maxWidth: 560 + 2 * space.xxl, gap: space.lg },
    backLink: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, alignSelf: 'flex-start' },
    top: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
    section: { gap: space.md, paddingTop: space.lg, borderTopWidth: 1, borderColor: color.hairline },
    event: { flexDirection: 'row', gap: space.md },
    date: { width: 88, paddingTop: 2 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 44 },
    disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md },
    alert: { gap: space.sm, padding: space.md, borderWidth: 1, borderColor: color.refused, backgroundColor: color.card },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    actionBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg, backgroundColor: color.paper, borderTopWidth: 1, borderColor: color.hairline,
    },
});
