import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../lib/api';
import { ACCESS_TOKEN_KEY } from '../lib/auth';
import { registryNumber, splitName } from '../lib/format';
import { deleteItemAsync } from '../lib/storage';
import { NoPhoto, usePhoto } from '../components/WatchPhoto';
import { Button, Container, Glow, PieceName, Rise, Spinner, TextLink, Wordmark, t, transition, useLayout, web } from '../components/ui';
import { color, space } from '../theme/tokens';

type Asset = { id: string; name: string; brand: string; model: string; reference: string; imageUrl?: string | null };

export default function DashboardScreen() {
    const router = useRouter();
    const { size, compact } = useLayout();
    const [assets, setAssets] = useState<Asset[] | null>(null);
    const [error, setError] = useState(false);

    const load = useCallback(() => {
        let cancelled = false;
        setError(false);
        api.get('/assets')
            .then((res) => !cancelled && setAssets(res.data))
            .catch((e) => {
                if (cancelled) return;
                if (axios.isAxiosError(e) && e.response?.status === 401) return router.replace('/');
                setError(true);
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
    const count = assets?.length ?? 0;

    return (
        <ScrollView style={{ backgroundColor: color.paper }} contentContainerStyle={{ paddingBottom: 72 }}>
            <Container style={styles.bar}>
                <Wordmark />
                <TextLink label="Déconnexion" tone={color.ink} onPress={logout} />
            </Container>

            <Container style={styles.head}>
                <View style={{ gap: 8, flexShrink: 1 }}>
                    <Text style={t.caps}>COLLECTION PRIVÉE</Text>
                    <Text accessibilityRole="header" style={[t.serif, { fontSize: compact ? 48 : 72, lineHeight: compact ? 50 : 74 }]}>
                        Vos <Text style={[t.italic, { color: color.seal }]}>pièces</Text>
                    </Text>
                    {assets ? (
                        <Text style={[t.body, { color: color.slate }]}>
                            {count === 0 ? 'Aucune pièce inscrite' : `${count} pièce${count > 1 ? 's' : ''} inscrite${count > 1 ? 's' : ''} au registre`}
                        </Text>
                    ) : null}
                </View>
                <Button label="Inscrire une pièce" arrow onPress={() => router.push('/watch/new')} style={{ minWidth: 240 }} />
            </Container>

            <Container>
                {error ? (
                    <View style={styles.message}>
                        <Text style={t.lead}>Impossible de charger votre collection. Vérifiez votre connexion.</Text>
                        <Button label="Réessayer" variant="secondary" onPress={load} style={{ alignSelf: 'flex-start' }} />
                    </View>
                ) : !assets ? (
                    <View style={[styles.message, { alignItems: 'center' }]}>
                        <Spinner size={64} track={color.hairline} />
                    </View>
                ) : count === 0 ? (
                    <View style={styles.message}>
                        <Text style={t.lead}>Votre collection est vide.</Text>
                        <Text style={[t.body, { color: color.slate, maxWidth: 520 }]}>
                            Inscrivez votre première pièce : Certis la signe, et vous pourrez la présenter à un acheteur ou la céder.
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
        </ScrollView>
    );
}

function Card({ asset, onPress }: { asset: Asset; onPress: () => void }) {
    const { photo, onError } = usePhoto(asset.reference, asset.imageUrl);
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
