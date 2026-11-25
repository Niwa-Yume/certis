import { type ReactNode, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import api from '../lib/api';
import { clock, longDate, registryNumber, shortDate, splitName } from '../lib/format';
import { tr } from '../lib/i18n';
import { type EventType, type Specs, describeEvent, downloadJson } from '../lib/registry';
import { color, font, space, typeScale } from '../theme/tokens';
import FaceLine, { type Face } from './Face';
import Showcase from './Showcase';
import { Badge, Button, Icon, Notice, PieceName, TextField, TextLink, t, transition, useLayout } from './ui';

/** Réponse de POST /assets/:id/authenticate quand passeport, chaîne et registre concordent. */
export type Verification = {
    valid: true;
    verifiedAt: string;
    status: 'ACTIVE' | 'STOLEN';
    // Pièce d'essai (ADR-0012) : à dire avant tout, pour qu'aucun acheteur ne s'y trompe.
    trial: boolean;
    imageCutout: boolean;
    // La personne de la maison qui a émis le passeport, hors signature (null si la maison ne l'a pas renseignée).
    issuedBy: Face | null;
    // Tout ce que voit l'acheteur vient du passeport signé par la maison (ADR-0004).
    passport: {
        issuer: { id: string; name: string };
        validFrom: string;
        credentialSubject: {
            id: string; brand: string; model: string; name: string; reference: string;
            specs: Specs; image: string | null;
        };
    };
    // Absents d'un partage sans histoire : le propriétaire n'a montré que le passeport (ADR-0018).
    provenance?: { type: EventType; at: string; note?: string }[];
    proof?: { passport: string; events: { seq: number; hash: string }[]; anchors: unknown[]; keys: string };
    stolenAt?: string;
};

/**
 * Écran 7, côté acheteur : la pièce en grand, puis la réponse en une ligne (« Passeport vérifié,
 * émis par la maison »), le statut de vol en fait daté, l'histoire, la cession guidée.
 * La cryptographie reste dans le volet « Preuves », fermé par défaut.
 */
export default function Passport({ result, nonce }: { result: Verification; nonce?: string }) {
    const { wide } = useLayout();
    const piece = result.passport.credentialSubject;
    const house = result.passport.issuer.name;
    const stolen = result.status === 'STOLEN';
    const stolenAt = result.stolenAt ?? [...(result.provenance ?? [])].reverse().find((e) => e.type === 'STOLEN_REPORTED')?.at;
    const title = wide ? typeScale.display : typeScale.title;

    return (
        <Showcase imageUrl={piece.image} cutout={result.imageCutout} label={`${piece.name}, ${house}`}>
            {result.trial ? <Notice tone="info" message={tr.verify.trial} /> : null}

            <View accessibilityLiveRegion="polite" style={{ gap: space.sm }}>
                {/* Volée : l'alerte d'abord, en rouge ; le passeport en règle ne vient qu'ensuite. */}
                <View style={styles.verdict}>
                    <Icon name={stolen ? 'alert' : 'check'} size={28} tone={stolen ? color.refused : color.verified} weight={2.5} />
                    <Text
                        accessibilityRole="header"
                        maxFontSizeMultiplier={1.3}
                        style={[t.serif, { fontSize: title, lineHeight: title * 1.05, flexShrink: 1 }, stolen ? { color: color.refused } : null]}
                    >
                        {stolen ? tr.verify.stolenTitle : tr.verify.verified}
                    </Text>
                </View>
                <Text style={[t.body, t.strong]}>{stolen ? tr.verify.verifiedBy(house) : tr.verify.issuedBy(house)}</Text>
                <Text style={t.label}>{tr.verify.checkedAt(shortDate(result.verifiedAt), clock(result.verifiedAt))}</Text>
            </View>

            {stolen ? (
                <View accessibilityRole="alert" style={styles.alarm}>
                    <Text style={[t.body, t.strong, { color: color.refused }]}>{tr.verify.stolen(stolenAt ? longDate(stolenAt) : '')}</Text>
                    <Text style={t.body}>{tr.verify.stolenBody}</Text>
                </View>
            ) : null}

            {result.issuedBy ? <FaceLine face={result.issuedBy} house={house} /> : null}

            <View style={{ gap: space.xs }}>
                <Text style={t.caps}>{piece.brand} · {piece.reference}</Text>
                <PieceName parts={splitName(piece.name, piece.model)} size={typeScale.title} />
            </View>
            <Text style={[t.body, { color: color.slate }]}>{tr.verify.proves(piece.reference)}</Text>

            {result.provenance ? <Section title={tr.verify.history}>
                {result.provenance.map((e, i) => {
                    const d = describeEvent(e.type, { issuer: house, note: e.note });
                    return (
                        <View key={i} style={styles.event}>
                            <Text style={[t.label, styles.date]}>{shortDate(e.at)}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={t.body}>{d.label}</Text>
                                {d.note ? <Text style={t.small}>{d.note}</Text> : null}
                            </View>
                        </View>
                    );
                })}
            </Section> : null}

            {stolen ? null : (
                <Section title={tr.verify.buyTitle}>
                    {tr.verify.buySteps.map((step, i) => (
                        <View key={step} style={styles.step}>
                            <Text style={[t.body, t.strong]}>{i + 1}.</Text>
                            <Text style={[t.body, { flex: 1 }]}>{step}</Text>
                        </View>
                    ))}
                </Section>
            )}

            {result.proof ? <Proofs result={result} nonce={nonce} /> : null}
        </Showcase>
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

/** Le volet technique, fermé par défaut : signatures, chaîne, numéro de série, fichier de preuve. */
function Proofs({ result, nonce }: { result: Verification; nonce?: string }) {
    const [open, setOpen] = useState(false);
    const proof = result.proof!;
    const piece = result.passport.credentialSubject;
    const kid = (JSON.parse(atob(proof.passport.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))) as { kid: string }).kid;
    const head = proof.events[proof.events.length - 1]?.hash ?? '';
    const rows = [
        [tr.verify.registry, registryNumber(piece.id)],
        [tr.verify.signature, tr.verify.signatureValue],
        [tr.verify.issuerKey, `${kid.slice(0, 16)}…`],
        [tr.verify.chainHead, `${head.slice(0, 16)}…`],
    ];
    return (
        <View style={styles.section}>
            <Pressable
                onPress={() => setOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={styles.disclosure}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[t.body, t.strong]}>{tr.verify.proofs}</Text>
                    <Text style={t.small}>{tr.verify.proofsHint}</Text>
                </View>
                <View style={[{ transform: [{ rotate: open ? '90deg' : '0deg' }] }, transition('transform', 200)]}>
                    <Icon name="arrow" size={18} />
                </View>
            </Pressable>
            {open ? (
                <View style={{ gap: space.md }}>
                    {rows.map(([label, value]) => (
                        <View key={label} style={styles.proofRow}>
                            <Text style={t.small}>{label}</Text>
                            <Text selectable style={[t.mono, { color: color.ink }]}>{value}</Text>
                        </View>
                    ))}
                    <Text style={t.small}>{tr.verify.independent}</Text>
                    {Platform.OS === 'web' ? (
                        <TextLink
                            label={tr.verify.download}
                            onPress={() => downloadJson(`certis-preuve-${registryNumber(piece.id).replace(/·/g, '-')}.json`, { passport: proof.passport, events: proof.events, anchors: proof.anchors })}
                        />
                    ) : null}
                    {/* La comparaison du numéro gravé exige le QR présenté en personne, pas un lien partagé. */}
                    {nonce ? <SerialCheck assetId={piece.id} nonce={nonce} /> : null}
                </View>
            ) : null}
        </View>
    );
}

/**
 * L'acheteur lit le numéro gravé et le compare à l'empreinte du passeport. Le serveur ne répond
 * que « correspond » ou non, 5 fois au plus pour ce QR (ADR-0005). Jamais demandé au propriétaire.
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
            setAnswer({ error: status === 429 ? tr.verify.serialLimit : status === 403 ? tr.verify.serialExpired : tr.verify.serialError });
        } finally {
            setBusy(false);
        }
    };
    return (
        <View style={styles.serial}>
            <Text style={[t.body, t.strong]}>{tr.verify.serialTitle}</Text>
            <Text style={t.small}>{tr.verify.serialBody}</Text>
            <TextField label={tr.verify.serialLabel} value={serial} onChangeText={setSerial} autoCapitalize="characters" onSubmitEditing={compare} />
            <Button label={tr.verify.serialAction} variant="secondary" loading={busy} onPress={compare} />
            {answer ? (
                <View accessibilityLiveRegion="polite">
                    {'match' in answer ? (
                        <Badge label={answer.match ? tr.verify.serialMatch : tr.verify.serialMismatch} tone={answer.match ? 'verified' : 'refused'} />
                    ) : (
                        <Text style={[t.small, { color: color.refused }]}>{answer.error}</Text>
                    )}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    verdict: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    alarm: { gap: space.sm, paddingLeft: space.md, borderLeftWidth: 3, borderColor: color.refused },
    section: { gap: space.md, paddingTop: space.lg, borderTopWidth: 1, borderColor: color.hairline },
    event: { flexDirection: 'row', gap: space.md },
    date: { width: 88, paddingTop: 2, fontFamily: font.mono },
    step: { flexDirection: 'row', gap: space.sm },
    disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md },
    proofRow: { gap: space.xs },
    serial: { gap: space.md, paddingTop: space.md, borderTopWidth: 1, borderColor: color.hairline },
});
