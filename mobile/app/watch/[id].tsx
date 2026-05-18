import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import api from '../../lib/api';

type Watch = {
    id: string;
    name: string;
    brand: string;
    model: string;
    reference: string;
    status: string;
    ownerId: string;
    integrityHash: string;
};

export default function WatchScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [watch, setWatch] = useState<Watch | null>(null);
    const [nonce, setNonce] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        api.get(`/assets/${id}`)
            .then(res => setWatch(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    // Countdown
    useEffect(() => {
        if (!expiresAt) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

            setSecondsLeft(remaining);

            if (remaining === 0) {
                clearInterval(interval);
                setNonce(null);
                setExpiresAt(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    const generateNonce = async () => {
        setRefreshing(true);
        try {
            const res = await api.get(`/assets/${id}/nonce`);
            setNonce(res.data.nonce);
            setExpiresAt(new Date(res.data.expiresAt));
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    };

    const getQrValue = () => {
        return `exp://192.168.1.140:8081/--/verify?id=${id}&nonce=${nonce}`;
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!watch) {
        return (
            <View style={styles.centered}>
                <Text>Montre introuvable</Text>
            </View>
        );
    }
    const getCountdownColor = () => {
        if (secondsLeft > 15) return '#2e7d32';
        if (secondsLeft > 5) return '#f57c00';
        return '#c62828';
    };

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineMedium" style={styles.title}>{watch.name}</Text>

            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium">Informations</Text>
                    <Text variant="bodyMedium">Marque : {watch.brand}</Text>
                    <Text variant="bodyMedium">Modèle : {watch.model}</Text>
                    <Text variant="bodyMedium">Référence : {watch.reference}</Text>
                    <Text variant="bodyMedium">Propriétaire : {watch.ownerId}</Text>
                    <Chip style={styles.chip}>{watch.status}</Chip>
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Content style={styles.qrContainer}>
                    <Text variant="titleMedium" style={styles.qrTitle}>
                        QR Code d'authentification
                    </Text>

                    {nonce ? (
                        <>
                            <QRCode value={getQrValue()} size={220} />
                            <Text style={[styles.countdown, { color: getCountdownColor() }]}>
                                {secondsLeft}s
                            </Text>
                        </>
                    ) : (
                        <Text variant="bodyMedium" style={styles.hint}>
                            Génère un QR code pour authentifier cette montre
                        </Text>
                    )}

                    <Button
                        mode="contained"
                        onPress={generateNonce}
                        loading={refreshing}
                        style={styles.button}
                    >
                        {nonce ? 'Régénérer le QR' : 'Générer le QR'}
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff', paddingTop: 60 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { marginBottom: 16, fontWeight: 'bold' },
    card: { marginBottom: 16 },
    chip: { marginTop: 8, alignSelf: 'flex-start' },
    qrContainer: { alignItems: 'center' },
    qrTitle: { marginBottom: 16 },
    hint: { color: '#888', marginBottom: 16, textAlign: 'center' },
    expiry: { marginTop: 12, color: '#888' },
    button: { marginTop: 16, width: '100%' },
    countdown: { fontSize: 48, fontWeight: 'bold', marginTop: 12 },
});