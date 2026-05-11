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
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        api.get(`/assets/${id}`)
            .then(res => setWatch(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

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
        return `http://192.168.1.140:3001/assets/${id}/authenticate?nonce=${nonce}`;
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
                            <Text variant="bodySmall" style={styles.expiry}>
                                Expire à : {expiresAt?.toLocaleTimeString()}
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
});