import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import api, { explain } from '../lib/api';
import { tr } from '../lib/i18n';
import { clock, longDate } from '../lib/format';
import { color, palette, space } from '../theme/tokens';
import { Button, CopyButton, Notice, TextLink, t } from './ui';

export type ShareItem = { id: string; history: boolean; expiresAt: string };
const HOURS = [1, 24, 168] as const;

/**
 * Écran 6 : le contrôle. Rien n'est public tant que le propriétaire ne crée pas de lien ; il en
 * choisit la durée et ce qu'il montre, et l'arrête quand il veut (ADR-0018).
 */
export default function Share({ assetId, shares, onChange }: { assetId: string; shares: ShareItem[]; onChange: () => void }) {
    const [hours, setHours] = useState<(typeof HOURS)[number]>(24);
    const [history, setHistory] = useState(false);
    const [link, setLink] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const act = async (run: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await run();
            onChange();
        } catch (e) {
            setError(explain(e, tr.share.failed));
        } finally {
            setBusy(false);
        }
    };
    const create = () => act(async () => {
        const { data } = await api.post(`/assets/${assetId}/shares`, { hours, history });
        setLink(Linking.createURL('/share', { queryParams: { t: data.token } }));
    });
    const stop = (id: string) => act(async () => {
        await api.delete(`/assets/${assetId}/shares/${id}`);
        setLink(null);
    });

    return (
        <View style={{ gap: space.md }}>
            <Text style={t.body}>{tr.share.intro}</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={tr.share.duration} style={styles.choices}>
                {HOURS.map((h) => (
                    <Pressable
                        key={h}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: hours === h }}
                        aria-checked={hours === h}
                        onPress={() => setHours(h)}
                        style={[styles.choice, hours === h ? styles.chosen : null]}
                    >
                        <Text style={[t.body, t.medium, { color: hours === h ? color.paper : color.ink }]}>{tr.share.hours[h]}</Text>
                    </Pressable>
                ))}
            </View>
            <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: history }}
                aria-checked={history}
                onPress={() => setHistory((v) => !v)}
                style={styles.toggle}
            >
                <View style={[styles.box, history ? styles.chosen : null]} />
                <View style={{ flex: 1 }}>
                    <Text style={[t.body, t.medium]}>{tr.share.history}</Text>
                    <Text style={t.small}>{tr.share.historyHint}</Text>
                </View>
            </Pressable>
            {error ? <Notice message={error} /> : null}
            <Button label={tr.share.create} arrow loading={busy} onPress={create} />

            {link ? (
                <View style={styles.code}>
                    {/* Encre sur fond clair, de nuit aussi : tous les lecteurs ne lisent pas un QR inversé. */}
                    <View accessible accessibilityRole="image" accessibilityLabel={`QR : ${tr.share.link}`} style={styles.qr}>
                        <QRCode value={link} size={180} color={palette.light.ink} backgroundColor={palette.light.card} />
                    </View>
                    <View style={{ flex: 1, minWidth: 200, gap: space.sm }}>
                        <Text selectable numberOfLines={1} style={[t.mono, { color: color.ink }]}>{link}</Text>
                        <CopyButton value={link} what={tr.share.link} />
                    </View>
                </View>
            ) : null}

            {shares.length ? (
                <View style={{ gap: space.sm }}>
                    <Text style={t.caps}>{tr.share.active}</Text>
                    {shares.map((s) => (
                        <View key={s.id} style={styles.row}>
                            <Text style={[t.small, { flex: 1 }]}>
                                {tr.share.until(`${longDate(s.expiresAt)}, ${clock(s.expiresAt)}`)} · {s.history ? tr.share.withHistory : tr.share.withoutHistory}
                            </Text>
                            <TextLink label={tr.share.stop} tone={color.refused} onPress={() => stop(s.id)} />
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    choice: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center', borderWidth: 1, borderColor: color.hairline },
    // L'encre, pas la vitrine : de jour comme de nuit, le choix se voit à plus de 3:1.
    chosen: { backgroundColor: color.ink, borderColor: color.ink },
    toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
    box: { width: 24, height: 24, borderWidth: 1, borderColor: color.slate },
    code: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
    qr: { padding: space.md, backgroundColor: palette.light.card, borderWidth: 1, borderColor: color.hairline },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
});
