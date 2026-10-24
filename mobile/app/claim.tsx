import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import api from '../lib/api';
import { ACCESS_TOKEN_KEY } from '../lib/auth';
import { getItemAsync } from '../lib/storage';
import { registryNumber } from '../lib/format';
import { Button, Seal, Stamp, Wordmark, t } from '../components/ui';
import { color, space } from '../theme/tokens';

/** Le destinataire d'une cession accepte la pièce : elle rejoint sa collection et est signée à nouveau. */
export default function ClaimScreen() {
    const { id, nonce } = useLocalSearchParams<{ id: string; nonce: string }>();
    const router = useRouter();
    const [signedIn, setSignedIn] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const here = `/claim?id=${encodeURIComponent(id ?? '')}&nonce=${encodeURIComponent(nonce ?? '')}`;

    useEffect(() => {
        getItemAsync(ACCESS_TOKEN_KEY).then((token) => setSignedIn(Boolean(token)));
    }, []);

    const accept = async () => {
        setLoading(true);
        setError(null);
        try {
            await api.post(`/assets/${id}/claim`, { nonce });
            setClaimed(true);
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401) return setSignedIn(false);
            // Le serveur dit pourquoi (offre réservée, déjà propriétaire, QR expiré…) : on l'affiche.
            const message = axios.isAxiosError(e) ? e.response?.data?.message : undefined;
            setError(typeof message === 'string' ? message : 'Cession impossible pour le moment. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={{ backgroundColor: color.paper }} contentContainerStyle={styles.scroll}>
            <View style={styles.column}>
                <Wordmark />
                {!id || !nonce ? (
                    <View style={styles.block}>
                        <Text accessibilityRole="header" style={[t.serif, styles.title]}>QR incomplet</Text>
                        <Text style={t.body}>Ce lien de cession est incomplet. Demandez au propriétaire d’afficher à nouveau le QR, puis scannez-le.</Text>
                    </View>
                ) : claimed ? (
                    <View style={styles.block}>
                        <Stamp style={{ alignSelf: 'flex-start' }}>
                            <Seal number={registryNumber(id)} size={112} />
                        </Stamp>
                        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[t.serif, styles.title]}>
                            Pièce <Text style={[t.italic, { color: color.seal }]}>reçue</Text>
                        </Text>
                        <Text style={t.body}>Elle figure maintenant dans votre collection, et son certificat est signé à votre nom.</Text>
                        <Button label="Voir la pièce" arrow onPress={() => router.replace(`/watch/${id}`)} />
                    </View>
                ) : (
                    <View style={styles.block}>
                        <Text style={t.caps}>CESSION</Text>
                        <Text accessibilityRole="header" style={[t.serif, styles.title]}>
                            Recevoir <Text style={[t.italic, { color: color.seal }]}>une pièce</Text>
                        </Text>
                        <Text style={t.body}>
                            Un propriétaire vous cède une montre inscrite au registre. En l’acceptant, elle rejoint votre collection et son certificat est signé à nouveau, à votre nom.
                        </Text>
                        {signedIn === false ? (
                            <>
                                <Text style={[t.body, { color: color.slate }]}>Connectez-vous pour accepter la pièce : vous reviendrez ici ensuite.</Text>
                                <Button label="Se connecter" arrow onPress={() => router.push({ pathname: '/login', params: { next: here } })} />
                                <Button label="Créer un compte" variant="secondary" onPress={() => router.push({ pathname: '/register', params: { next: here } })} />
                            </>
                        ) : (
                            <>
                                {error ? <Text accessibilityLiveRegion="polite" style={[t.body, { color: color.refused }]}>{error}</Text> : null}
                                <Button label="Accepter la pièce" arrow loading={loading} disabled={signedIn === null} onPress={accept} />
                                <Button label="Refuser" variant="secondary" onPress={() => router.replace('/dashboard')} />
                            </>
                        )}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg },
    column: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: space.xl },
    block: { gap: space.md },
    title: { fontSize: 48, lineHeight: 50 },
});
