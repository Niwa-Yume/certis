import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import api, { explain } from '../lib/api';
import { ACCESS_TOKEN_KEY } from '../lib/auth';
import { registryNumber, splitName } from '../lib/format';
import { deleteItemAsync } from '../lib/storage';
import { NoPhoto, usePhoto } from '../components/WatchPhoto';
import { Badge, Button, Container, Glow, Notice, PieceName, Rise, Spinner, TextField, TextLink, Wordmark, t, transition, useLayout, web } from '../components/ui';
import { color, space } from '../theme/tokens';

type Asset = {
    id: string; name: string; brand: string; model: string; reference: string;
    status: string; imageUrl: string | null; imageCutout: boolean;
    // Pièce d'essai donnée à l'inscription (ADR-0012) : elle ne vaut pour aucune montre réelle.
    trial: boolean;
};
type Me = { role: 'OWNER' | 'ISSUER'; issuer: { name: string } | null };

export default function DashboardScreen() {
    const router = useRouter();
    const { size, compact } = useLayout();
    const [assets, setAssets] = useState<Asset[] | null>(null);
    const [me, setMe] = useState<Me | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        let cancelled = false;
        setError(null);
        // Le rôle décide de l'écran : seul un émetteur inscrit des pièces (ADR-0003).
        api.get('/auth/me').then((res) => !cancelled && setMe(res.data), () => undefined);
        api.get('/assets')
            .then((res) => !cancelled && setAssets(res.data))
            .catch((e) => {
                if (cancelled) return;
                if (axios.isAxiosError(e) && e.response?.status === 401) return router.replace('/');
                setError(explain(e, 'Collection indisponible : réessayez dans un instant.'));
            });
        return () => { cancelled = true; };
    }, [router]);

    // Rechargée à chaque retour sur l'écran : une pièce reçue ou inscrite apparaît sans rafraîchir.
    useFocusEffect(load);

    const logout = async () => {
        await deleteItemAsync(ACCESS_TOKEN_KEY);
        router.replace('/');
    };

    const columns = size === 'wide' ? 3 : size === 'medium' ? 2 : 1;
    const issuer = me?.role === 'ISSUER' ? me.issuer?.name ?? 'Émetteur' : null;
    const count = assets?.length ?? 0;

    return (
        <ScrollView style={{ backgroundColor: color.paper }} contentContainerStyle={{ paddingBottom: 72 }}>
            <Container style={styles.bar}>
                <Wordmark />
                <TextLink label="Déconnexion" tone={color.ink} onPress={logout} />
            </Container>

            <Container style={styles.head}>
                <View style={{ gap: 8, flexShrink: 1 }}>
                    <Text style={t.caps}>{issuer ? `${issuer.toUpperCase()} · ÉMETTEUR` : 'COLLECTION PRIVÉE'}</Text>
                    <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { fontSize: compact ? 48 : 72, lineHeight: compact ? 50 : 74 }]}>
                        Vos <Text style={[t.italic, { color: color.seal }]}>pièces</Text>
                    </Text>
                    {assets ? (
                        <Text style={[t.body, { color: color.slate }]}>
                            {count === 0 ? 'Aucune pièce inscrite' : `${count} pièce${count > 1 ? 's' : ''} inscrite${count > 1 ? 's' : ''} au registre`}
                        </Text>
                    ) : null}
                </View>
                {issuer ? <Button label="Inscrire une pièce" arrow onPress={() => router.push('/watch/new')} style={{ minWidth: 240 }} /> : null}
            </Container>

            <Container>
                {error ? (
                    <View style={styles.message}>
                        <Notice message={error} />
                        <Button label="Réessayer" variant="secondary" onPress={load} style={{ alignSelf: 'flex-start' }} />
                    </View>
                ) : !assets ? (
                    <View style={[styles.message, { alignItems: 'center' }]}>
                        <Spinner size={64} track={color.hairline} />
                    </View>
                ) : count === 0 ? (
                    <View style={styles.message}>
                        <Text style={t.lead}>{issuer ? 'Votre stock est vide.' : 'Votre collection est vide.'}</Text>
                        <Text style={[t.body, { color: color.slate, maxWidth: 520 }]}>
                            {issuer
                                ? 'Inscrivez une pièce que vous avez examinée : vous signez son passeport, puis vous pouvez la remettre à son acheteur.'
                                : 'Une pièce arrive dans votre collection quand son émetteur ou son propriétaire vous la cède : scannez le QR qu’il vous présente, depuis votre compte.'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {assets.map((asset, i) => (
                            <Rise key={asset.id} delay={i * 80} distance={20} style={{ width: `${100 / columns}%`, padding: space.sm }}>
                                <Card asset={asset} onPress={() => router.push(`/watch/${asset.id}`)} />
                            </Rise>
                        ))}
                    </View>
                )}
            </Container>

            <Container style={styles.account}>
                <EraseAccount onErased={logout} />
            </Container>
        </ScrollView>
    );
}

/**
 * Droit à l'effacement (RGPD) : deux temps et le mot de passe, l'action est irréversible.
 * Le serveur refuse tant que le compte détient des pièces, et le dit.
 */
function EraseAccount({ onErased }: { onErased: () => void }) {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const erase = async () => {
        setBusy(true);
        setError(null);
        try {
            await api.delete('/auth/me', { data: { password } });
            onErased();
        } catch (e) {
            setError(explain(e, 'Suppression impossible pour le moment : réessayez dans un instant.'));
        } finally {
            setBusy(false);
        }
    };

    if (!open) return <TextLink label="Supprimer mon compte" tone={color.slate} onPress={() => setOpen(true)} />;
    return (
        <View style={styles.erase}>
            <Text style={[t.body, t.strong]}>Supprimer mon compte</Text>
            <Text style={t.body}>
                Votre compte et votre e-mail sont effacés. L’historique des pièces que vous avez possédées reste vérifiable, mais plus rien ne permet de le rattacher à vous.
            </Text>
            <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
            {error ? <Notice message={error} /> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                <Button label="Supprimer définitivement" loading={busy} disabled={!password} onPress={erase} />
                <Button label="Annuler" variant="secondary" onPress={() => { setOpen(false); setPassword(''); setError(null); }} />
            </View>
        </View>
    );
}

function Card({ asset, onPress }: { asset: Asset; onPress: () => void }) {
    const { photo, onError } = usePhoto(asset.imageUrl, asset.imageCutout);
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="link"
            accessibilityLabel={`${asset.brand} ${asset.name}, référence ${asset.reference}`}
            style={(s) => {
                const hovered = (s as { hovered?: boolean }).hovered;
                return [
                    styles.card,
                    hovered && styles.cardHover,
                    s.pressed && { transform: [{ scale: 0.99 }] },
                    transition('transform, box-shadow', 300),
                ];
            }}
        >
            <View style={styles.cardPhoto}>
                <Glow strength={0.22} />
                {photo ? (
                    <Image
                        source={photo.source}
                        onError={onError}
                        resizeMode={photo.cutout ? 'contain' : 'cover'}
                        style={[
                            // Dimensions explicites : sinon RN Web reprend la taille native de l'image.
                            { position: 'absolute', left: 0, width: '100%', top: photo.cutout ? 16 : 0, height: photo.cutout ? 288 : '100%' },
                            photo.cutout ? web({ filter: 'drop-shadow(0 16px 20px rgba(0,0,0,0.45))' }) : null,
                        ]}
                    />
                ) : (
                    <NoPhoto />
                )}
                {asset.status === 'STOLEN' || asset.trial ? (
                    <View style={{ position: 'absolute', top: 12, left: 12, gap: 6 }}>
                        {asset.status === 'STOLEN' ? <Badge label="Déclarée volée" tone="refused" /> : null}
                        {asset.trial ? <Badge label="Pièce d’essai" tone="info" /> : null}
                    </View>
                ) : null}
            </View>
            <View style={styles.cardBody}>
                <Text style={[t.caps, { fontSize: 12 }]}>{asset.brand.toUpperCase()}</Text>
                <PieceName parts={splitName(asset.name)} size={30} />
                <View style={styles.cardMeta}>
                    <Text style={[t.ref, { fontSize: 13 }]}>{asset.reference}</Text>
                    <Text style={t.mono}>{registryNumber(asset.id)}</Text>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    account: { marginTop: space.xl, paddingTop: space.lg, borderTopWidth: 1, borderColor: color.hairline },
    erase: { gap: space.md, maxWidth: 520, padding: space.md, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.card },
    bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: color.hairline },
    head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.lg, paddingTop: space.xl, paddingBottom: space.lg },
    message: { gap: space.md, paddingVertical: space.xl },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.sm },
    card: { backgroundColor: color.card, borderWidth: 1, borderColor: color.hairline },
    cardHover: { transform: [{ translateY: -4 }], boxShadow: '0 22px 44px rgba(11,20,48,0.16)' },
    cardPhoto: { height: 320, backgroundColor: color.seal, overflow: 'hidden' },
    cardBody: { padding: 18, gap: 6 },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: color.hairline },
});
