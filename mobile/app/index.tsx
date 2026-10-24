import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { ACCESS_TOKEN_KEY } from '../lib/auth';
import api from '../lib/api';
import { deleteItemAsync, getItemAsync } from '../lib/storage';
import watchImages from '../lib/watchImages';
import { WatchVisual } from '../components/WatchPhoto';
import { Button, Container, Glow, PieceName, Rise, Seal, Spinner, Stamp, TextLink, Wordmark, fluid, t, useLayout } from '../components/ui';
import { color, space } from '../theme/tokens';

const STEPS = [
    { n: '01', title: 'Le vendeur affiche le QR', text: 'Depuis son compte, sur la fiche de la pièce. Il est valable 60 secondes.' },
    { n: '02', title: 'Vous le scannez', text: 'Avec l’appareil photo de votre téléphone. Aucune application ni aucun compte.' },
    { n: '03', title: 'Certis répond', text: 'Authentique, non confirmée ou impossible à vérifier, avec la marche à suivre.' },
];

export default function IndexScreen() {
    const router = useRouter();
    const { width, compact } = useLayout();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!(await getItemAsync(ACCESS_TOKEN_KEY))) return !cancelled && setChecking(false);
            try {
                await api.get('/auth-test');
                if (!cancelled) router.replace('/dashboard');
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 401) await deleteItemAsync(ACCESS_TOKEN_KEY);
                if (!cancelled) setChecking(false);
            }
        })();
        return () => { cancelled = true; };
    }, [router]);

    if (checking) {
        return (
            <View style={[styles.center, { backgroundColor: color.seal }]}>
                <Spinner size={72} />
            </View>
        );
    }

    const carrera = watchImages['CV7A12.BA0795'];
    const title = fluid(width, 46, 6.2, 96);

    return (
        <ScrollView style={{ backgroundColor: color.paper }}>
            <View style={styles.hero}>
                <Glow cx={compact ? '50%' : '72%'} cy="55%" rx="45%" ry="55%" />
                <Container style={styles.nav}>
                    <Wordmark tone={color.paper} size={15} />
                    <TextLink label="Se connecter" tone={color.paper} onPress={() => router.push('/login')} />
                </Container>
                <Container style={[styles.heroBody, { flexDirection: compact ? 'column' : 'row' }]}>
                    <Rise style={{ flex: compact ? undefined : 1.2, gap: space.lg, maxWidth: 640 }}>
                        <Text style={t.caps}>
                            <Text style={{ color: color.mist }}>REGISTRE DES GARDE-TEMPS</Text>
                        </Text>
                        <PieceName
                            parts={['Chaque montre a une histoire.', 'Certis la rend vérifiable.']}
                            size={title}
                            stacked
                            accent={color.gold}
                            style={{ color: color.paper, lineHeight: title * 1.02 }}
                        />
                        <Text style={[t.lead, { color: color.mist, maxWidth: 520 }]}>
                            Inscrivez vos pièces, présentez-les à un acheteur, cédez-les en toute sécurité : chaque certificat est signé et vérifiable sans compte.
                        </Text>
                        <View style={styles.ctas}>
                            <Button label="Créer un compte" variant="light" arrow onPress={() => router.push('/register')} style={{ minWidth: 240 }} />
                            <Button label="Se connecter" variant="outlineLight" onPress={() => router.push('/login')} />
                        </View>
                    </Rise>
                    <Rise delay={200} distance={28} scale={0.97} style={{ alignSelf: 'center' }}>
                        <WatchVisual photo={carrera} label="TAG Heuer Carrera Calibre S" width={compact ? 200 : 280} height={compact ? 360 : 504}>
                            <Stamp delay={900} style={{ position: 'absolute', right: compact ? -12 : -24, bottom: compact ? 56 : 90 }}>
                                <Seal number="SPÉCIMEN" size={compact ? 80 : 104} />
                            </Stamp>
                        </WatchVisual>
                    </Rise>
                </Container>
            </View>

            <Container style={{ paddingVertical: compact ? 64 : 110, gap: space.xl }}>
                <View style={{ gap: 12, maxWidth: 640 }}>
                    <Text style={t.caps}>VOUS ACHETEZ UNE MONTRE ?</Text>
                    <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { fontSize: fluid(width, 40, 5, 72), lineHeight: fluid(width, 40, 5, 72) }]}>
                        Vérifiez-la <Text style={[t.italic, { color: color.seal }]}>avant de payer.</Text>
                    </Text>
                </View>
                <View style={styles.steps}>
                    {STEPS.map((s) => (
                        <View key={s.n} style={styles.step}>
                            <Text style={[t.wide, { fontSize: 28, color: color.seal }]}>{s.n}</Text>
                            <Text style={[t.lead, t.strong]}>{s.title}</Text>
                            <Text style={[t.body, { color: color.slate }]}>{s.text}</Text>
                        </View>
                    ))}
                </View>
            </Container>

            <View style={styles.footer}>
                <Container>
                    <Text style={t.small}>
                        Certis atteste l’intégrité de l’enregistrement d’une pièce. Il ne remplace pas l’expertise physique d’un revendeur agréé.
                    </Text>
                </Container>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hero: { backgroundColor: color.seal, overflow: 'hidden' },
    nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
    heroBody: { alignItems: 'center', gap: space.xl, paddingTop: space.xl, paddingBottom: 72 },
    ctas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
    steps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
    step: { flexGrow: 1, flexBasis: 260, gap: 10, paddingTop: space.lg, borderTopWidth: 1, borderColor: color.ink },
    footer: { borderTopWidth: 1, borderColor: color.hairline, paddingVertical: space.lg },
});
