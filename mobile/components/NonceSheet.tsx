import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import axios from 'axios';
import QRCode from 'react-native-qrcode-svg';
import api from '../lib/api';
import { color, space } from '../theme/tokens';
import { Button, IconButton, TextField, t, useLayout } from './ui';

type Kind = 'verify' | 'transfer';
type Offer = { nonce: string; expiresAt: number; ttl: number };

const COPY = {
    verify: {
        kicker: 'VÉRIFICATION',
        title: 'Présentez ce QR',
        text: 'L’acheteur le scanne avec l’appareil photo de son téléphone. Aucun compte n’est nécessaire.',
        route: '/verify',
    },
    transfer: {
        kicker: 'CESSION',
        title: 'Céder la pièce',
        text: 'Le nouveau propriétaire scanne ce QR depuis son compte Certis, puis accepte la pièce.',
        route: '/claim',
    },
} as const;

function reasonFrom(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (!error.response) return 'Serveur injoignable. Vérifiez votre connexion.';
        if (status === 404) return 'Aucun compte Certis n’utilise cet e-mail.';
        if (status === 400) return 'Cet e-mail n’est pas valide.';
        if (status === 429) return 'Trop de demandes. Réessayez dans une minute.';
    }
    return 'Impossible de générer le QR pour le moment.';
}

/**
 * QR à usage unique, lié à cette montre : 60 s pour une vérification, 5 min pour une cession.
 * Une cession peut être réservée à un destinataire précis (recommandé).
 */
export default function NonceSheet({ kind, assetId, onClose }: { kind: Kind | null; assetId: string; onClose: () => void }) {
    const { compact } = useLayout();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [left, setLeft] = useState(0);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const issue = useCallback(async (k: Kind, recipientEmail?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = k === 'verify'
                ? await api.post(`/assets/${assetId}/verifications`)
                : await api.post(`/assets/${assetId}/transfer-offers`, recipientEmail ? { recipientEmail } : {});
            const expiresAt = new Date(res.data.expiresAt).getTime();
            setOffer({ nonce: res.data.nonce, expiresAt, ttl: Math.max(1, Math.round((expiresAt - Date.now()) / 1000)) });
        } catch (e) {
            setError(reasonFrom(e));
        } finally {
            setLoading(false);
        }
    }, [assetId]);

    // Ouverture : la vérification part tout de suite, la cession attend un éventuel destinataire.
    useEffect(() => {
        setOffer(null);
        setError(null);
        setEmail('');
        if (kind === 'verify') issue('verify');
    }, [kind, issue]);

    useEffect(() => {
        if (!offer) return;
        const tick = () => setLeft(Math.max(0, Math.round((offer.expiresAt - Date.now()) / 1000)));
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [offer]);

    if (!kind) return null;
    const copy = COPY[kind];
    const expired = offer !== null && left === 0;
    const qr = offer && !expired ? Linking.createURL(copy.route, { queryParams: { id: assetId, nonce: offer.nonce } }) : null;
    const minutes = left >= 60 ? `${Math.floor(left / 60)} min ${String(left % 60).padStart(2, '0')}` : `${left} s`;

    return (
        <Modal transparent visible animationType="fade" onRequestClose={onClose}>
            <View style={[styles.backdrop, { justifyContent: compact ? 'flex-end' : 'center' }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" accessibilityRole="button" />
                <ScrollView
                    style={[styles.sheet, compact ? styles.sheetCompact : styles.sheetWide]}
                    contentContainerStyle={{ padding: space.lg, gap: space.md }}
                    accessibilityViewIsModal
                >
                    <View style={styles.head}>
                        <View style={{ flex: 1, gap: 6 }}>
                            <Text style={t.caps}>{copy.kicker}</Text>
                            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { fontSize: 36, lineHeight: 36 }]}>{copy.title}</Text>
                        </View>
                        <IconButton icon="close" label="Fermer" onPress={onClose} />
                    </View>
                    <Text style={t.body}>{copy.text}</Text>

                    {kind === 'transfer' && !offer ? (
                        <>
                            <TextField
                                label="E-mail du destinataire (recommandé)"
                                hint="Seul ce compte pourra accepter la pièce. Sans e-mail, quiconque scanne le QR peut l’accepter."
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                error={error}
                            />
                            <Button label="Générer le QR de cession" arrow loading={loading} onPress={() => issue('transfer', email.trim() || undefined)} />
                        </>
                    ) : null}

                    {qr ? (
                        <View style={{ alignItems: 'center', gap: space.md }}>
                            <View style={styles.qr} accessible accessibilityRole="image" accessibilityLabel={`QR de ${kind === 'verify' ? 'vérification' : 'cession'}`}>
                                <QRCode value={qr} size={220} color={color.seal} backgroundColor={color.card} />
                            </View>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progress, { width: `${(left / offer!.ttl) * 100}%` }]} />
                            </View>
                            <Text style={[t.mono, { color: color.ink }]} accessibilityLiveRegion="polite">
                                Valable encore {minutes} · une seule utilisation
                            </Text>
                            {email.trim() && kind === 'transfer' ? <Text style={t.small}>Réservé à {email.trim()}</Text> : null}
                        </View>
                    ) : null}

                    {kind === 'verify' && loading ? <Text style={t.small}>Génération du QR…</Text> : null}

                    {expired ? (
                        <View style={{ gap: space.md }}>
                            <Text style={t.body}>Ce QR a expiré : il ne peut plus servir.</Text>
                            <Button label="Générer un nouveau QR" arrow loading={loading} onPress={() => issue(kind, email.trim() || undefined)} />
                        </View>
                    ) : null}

                    {error && kind === 'verify' ? (
                        <View style={{ gap: space.md }}>
                            <Text style={[t.body, { color: color.refused }]}>{error}</Text>
                            <Button label="Réessayer" variant="secondary" onPress={() => issue('verify')} />
                        </View>
                    ) : null}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(11,20,48,0.62)' },
    sheet: { backgroundColor: color.paper, flexGrow: 0 },
    sheetCompact: { width: '100%', maxHeight: '92%', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    sheetWide: { width: 460, maxHeight: '90%' },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
    qr: { padding: 16, backgroundColor: color.card, borderWidth: 1, borderColor: color.hairline },
    progressTrack: { width: 252, height: 2, backgroundColor: color.hairline },
    progress: { height: 2, backgroundColor: color.seal },
});
