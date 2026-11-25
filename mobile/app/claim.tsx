import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import api, { explain } from '../lib/api';
import { ACCESS_TOKEN_KEY } from '../lib/auth';
import { tr } from '../lib/i18n';
import { getItemAsync } from '../lib/storage';
import Activation from '../components/Activation';
import { Button, Icon, Notice, Wordmark, t } from '../components/ui';
import { color, space, typeScale } from '../theme/tokens';

/** Écran 7, fin de la cession : l'acheteur accepte la pièce, puis retrouve sa collection (écran 3). */
// L'id vient du lien : encodé, il ne peut pas viser une autre route avec la session (audit run 1).
export default function ClaimScreen() {
    const { id, nonce } = useLocalSearchParams<{ id: string; nonce: string }>();
    const router = useRouter();
    const [signedIn, setSignedIn] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [claimed, setClaimed] = useState<false | { handover: boolean; name: string; house: string }>(false);
    const [error, setError] = useState<string | null>(null);
    const here = `/claim?id=${encodeURIComponent(id ?? '')}&nonce=${encodeURIComponent(nonce ?? '')}`;

    useEffect(() => {
        getItemAsync(ACCESS_TOKEN_KEY).then((token) => setSignedIn(Boolean(token)));
    }, []);

    const accept = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.post(`/assets/${encodeURIComponent(id)}/claim`, { nonce });
            // La pièce est maintenant à ce compte : on lit son nom et sa maison pour l'activation.
            const piece = await api.get(`/assets/${encodeURIComponent(id)}`).then((r) => r.data, () => null);
            setClaimed({ handover: Boolean(data.handover), name: piece?.name ?? '', house: piece?.issuer.name ?? '' });
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401) return setSignedIn(false);
            // Le serveur dit pourquoi (offre réservée, déjà propriétaire, QR expiré…) et quoi faire.
            setError(explain(e, tr.claim.failed));
        } finally {
            setLoading(false);
        }
    };

    const title = (text: string) => (
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3} style={[t.serif, styles.title]}>{text}</Text>
    );

    return (
        <ScrollView style={{ backgroundColor: color.paper }} contentContainerStyle={styles.scroll}>
            <View style={styles.column}>
                <Wordmark />
                {!id || !nonce ? (
                    <View style={styles.block}>
                        {title(tr.claim.title)}
                        <Notice message={tr.claim.incomplete} />
                    </View>
                ) : claimed && claimed.handover ? (
                    // Écran 2, côté client : la remise par la maison, le seul geste animé de l'app.
                    <View style={styles.block}>
                        <Activation piece={claimed.name} house={claimed.house} />
                        {title(tr.activation.title)}
                        <Text style={t.body}>{tr.activation.body(claimed.name, claimed.house)}</Text>
                        <Button label={tr.activation.open} arrow onPress={() => router.replace('/dashboard')} />
                    </View>
                ) : claimed ? (
                    <View style={styles.block}>
                        <Icon name="check" size={32} tone={color.verified} weight={2.5} />
                        {title(tr.claim.done)}
                        <Text style={t.body}>{tr.claim.doneBody}</Text>
                        <Button label={tr.claim.open} arrow onPress={() => router.replace('/dashboard')} />
                    </View>
                ) : (
                    <View style={styles.block}>
                        {title(tr.claim.title)}
                        <Text style={t.body}>{tr.claim.body}</Text>
                        {signedIn === false ? (
                            <>
                                <Text style={[t.body, { color: color.slate }]}>{tr.claim.signIn}</Text>
                                <Button label={tr.claim.login} arrow onPress={() => router.push({ pathname: '/login', params: { next: here } })} />
                                <Button label={tr.claim.register} variant="secondary" onPress={() => router.push({ pathname: '/register', params: { next: here } })} />
                            </>
                        ) : (
                            <>
                                {error ? <Notice message={error} /> : null}
                                <Button label={tr.claim.accept} arrow loading={loading} disabled={signedIn === null} onPress={accept} />
                                <Button label={tr.claim.decline} variant="secondary" onPress={() => router.replace('/dashboard')} />
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
    title: { fontSize: typeScale.title, lineHeight: typeScale.title * 1.1 },
});
