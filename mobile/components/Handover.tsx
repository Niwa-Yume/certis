import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import api, { explain } from '../lib/api';
import { tr } from '../lib/i18n';
import { color, palette, space } from '../theme/tokens';
import { Button, CopyButton, Notice, TextField, t } from './ui';

/**
 * Écran 2, côté maison : un outil métier, sobre. Inviter le client (QR ou lien), lui remettre la
 * pièce (QR de cession réservé à son compte), et la carte à imprimer. Aucune animation ici.
 */
export default function Handover({ assetId, cardId: initialCard }: { assetId: string; cardId: string | null }) {
    const [email, setEmail] = useState('');
    const [invite, setInvite] = useState<string | null>(null);
    const [offer, setOffer] = useState<string | null>(null);
    const [cardId, setCardId] = useState(initialCard);
    const [busy, setBusy] = useState<'invite' | 'handover' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async (kind: 'invite' | 'handover') => {
        setBusy(kind);
        setError(null);
        try {
            if (kind === 'invite') {
                const { data } = await api.post(`/assets/${assetId}/invitations`, { email });
                setInvite(Linking.createURL('/invite', { queryParams: { token: data.token } }));
                setCardId(data.cardId);
            } else {
                const { data } = await api.post(`/assets/${assetId}/transfer-offers`, { recipientEmail: email });
                setOffer(Linking.createURL('/claim', { queryParams: { id: assetId, nonce: data.nonce } }));
            }
        } catch (e) {
            setError(explain(e, tr.handover.failed));
        } finally {
            setBusy(null);
        }
    };

    const card = cardId ? Linking.createURL('/card', { queryParams: { c: cardId } }) : null;
    return (
        <View style={styles.section}>
            <Text accessibilityRole="header" style={t.caps}>{tr.handover.section}</Text>
            <TextField
                label={tr.handover.clientEmail}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="off"
            />
            {error ? <Notice message={error} /> : null}
            <View style={styles.buttons}>
                <Button label={tr.handover.invite} variant="secondary" loading={busy === 'invite'} disabled={!email} onPress={() => run('invite')} />
                <Button label={tr.handover.handover} arrow loading={busy === 'handover'} disabled={!email} onPress={() => run('handover')} />
            </View>
            {invite ? <Code value={invite} hint={tr.handover.inviteHint} copy={tr.handover.link} label={tr.handover.invite} /> : null}
            {offer ? <Code value={offer} hint={tr.handover.handoverHint} label={tr.handover.handover} /> : null}
            {card ? (
                <View nativeID="piece-card" style={{ gap: space.md }}>
                    <Text style={[t.body, t.strong]}>{tr.handover.card}</Text>
                    <Code value={card} hint={tr.handover.cardHint} label={tr.handover.card} />
                    {Platform.OS === 'web' ? <Button label={tr.handover.print} variant="secondary" onPress={() => window.print()} /> : null}
                </View>
            ) : null}
        </View>
    );
}

// Le QR reste encre sur fond clair, de nuit aussi : tous les lecteurs ne lisent pas un QR inversé.
function Code({ value, hint, label, copy }: { value: string; hint: string; label: string; copy?: string }) {
    return (
        <View style={styles.code}>
            <View accessible accessibilityRole="image" accessibilityLabel={`QR : ${label}`} style={styles.qr}>
                <QRCode value={value} size={200} color={palette.light.ink} backgroundColor={palette.light.card} />
            </View>
            <View style={{ flex: 1, minWidth: 200, gap: space.sm }}>
                <Text style={t.small}>{hint}</Text>
                {/* Le lien, lisible : la maison peut aussi l'envoyer elle-même. */}
                <Text selectable numberOfLines={1} style={[t.mono, { color: color.ink }]}>{value}</Text>
                <CopyButton value={value} what={copy ?? label} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { gap: space.md, paddingTop: space.lg, borderTopWidth: 1, borderColor: color.hairline },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    code: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
    qr: { padding: space.md, backgroundColor: palette.light.card, borderWidth: 1, borderColor: color.hairline },
});
