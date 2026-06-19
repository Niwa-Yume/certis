import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import api from '../../lib/api';
import { styles, getCountdownColor } from './watch.styles';
import watchImages from '../../lib/watchImages';

type Watch = {
    id: string;
    name: string;
    brand: string;
    model: string;
    reference: string;
    status: string;
    ownerId: string;
    integrityHash: string;
    imageUrl?: string;
};

export default function WatchScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [watch, setWatch] = useState<Watch | null>(null);
    const [nonce, setNonce] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [transferNonce, setTransferNonce] = useState<string | null>(null);
    const [transferSecondsLeft, setTransferSecondsLeft] = useState<number>(0);
    const [transferExpiresAt, setTransferExpiresAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const goBackToList = () => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace('/dashboard');
    };

    useEffect(() => {
        api.get(`/assets/${id}`)
            .then(res => setWatch(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    // Countdown nonce auth
    useEffect(() => {
        if (!expiresAt) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
            setSecondsLeft(remaining);
            if (remaining === 0) { clearInterval(interval); setNonce(null); setExpiresAt(null); }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    // Countdown nonce transfert
    useEffect(() => {
        if (!transferExpiresAt) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((transferExpiresAt.getTime() - Date.now()) / 1000));
            setTransferSecondsLeft(remaining);
            if (remaining === 0) { clearInterval(interval); setTransferNonce(null); setTransferExpiresAt(null); }
        }, 1000);
        return () => clearInterval(interval);
    }, [transferExpiresAt]);

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

    const generateTransferNonce = async () => {
        try {
            const res = await api.get(`/assets/${id}/nonce`);
            setTransferNonce(res.data.nonce);
            setTransferExpiresAt(new Date(res.data.expiresAt));
        } catch (e) {
            console.error(e);
        }
    };

    const getTransferQrValue = () => {
        return `exp://192.168.1.140:8081/--/claim?id=${id}&nonce=${transferNonce}`;
    };

    const formatOwner = (ownerId: string) => {
        if (ownerId.length <= 14) return ownerId;
        return `${ownerId.slice(0, 8)}...${ownerId.slice(-6)}`;
    };

    const formatHash = (hash: string) => {
        if (hash.length <= 20) return hash;
        return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
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
                <Button mode="text" onPress={goBackToList}>
                    Retour a la liste
                </Button>
            </View>
        );
    }
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Button mode="text" icon="arrow-left" onPress={goBackToList} style={styles.backButton}>
                Retour a la liste
            </Button>
            <Text variant="headlineMedium" style={styles.title}>{watch.name}</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
                {watch.brand} {watch.model} - Reference {watch.reference}
            </Text>

            <Card style={styles.card}>
                {(watch.imageUrl || watchImages[watch.reference]) && (
                    <Card.Cover
                        source={watch.imageUrl ? { uri: watch.imageUrl } : watchImages[watch.reference]}
                        style={styles.watchImage}
                    />
                )}
                {!(watch.imageUrl || watchImages[watch.reference]) && (
                    <View style={styles.emptyImage}>
                        <Text style={styles.emptyImageText}>Aucune image disponible</Text>
                    </View>
                )}
                <Card.Content style={styles.detailsCardContent}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Fiche d'identite</Text>

                    <View style={styles.row}>
                        <Text variant="bodyMedium" style={styles.rowLabel}>Marque</Text>
                        <Text variant="bodyMedium" style={styles.rowValue}>{watch.brand}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text variant="bodyMedium" style={styles.rowLabel}>Modele</Text>
                        <Text variant="bodyMedium" style={styles.rowValue}>{watch.model}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text variant="bodyMedium" style={styles.rowLabel}>Reference</Text>
                        <Text variant="bodyMedium" style={styles.rowValue}>{watch.reference}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text variant="bodyMedium" style={styles.rowLabel}>Proprietaire</Text>
                        <Text variant="bodyMedium" style={styles.rowValue}>{formatOwner(watch.ownerId)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text variant="bodyMedium" style={styles.rowLabel}>Empreinte</Text>
                        <Text variant="bodyMedium" style={styles.rowValue}>{formatHash(watch.integrityHash)}</Text>
                    </View>
                    <Chip style={styles.chip} textStyle={styles.chipText}>{watch.status}</Chip>
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Content style={styles.qrContainer}>
                    <View style={styles.qrCardHeader}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>QR d'authentification</Text>
                    </View>

                    {nonce ? (
                        <>
                            <View style={styles.qrWrap}>
                                <QRCode value={getQrValue()} size={220} />
                            </View>
                            <Text style={[styles.countdown, { color: getCountdownColor(secondsLeft) }]}>
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
                    >
                        {nonce ? 'Régénérer le QR' : 'Générer le QR'}
                    </Button>
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Content style={styles.qrContainer}>
                    <View style={styles.qrCardHeader}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Transfert securise</Text>
                        <Text variant="bodyMedium" style={styles.hint}>
                            Le receveur scanne ce QR depuis son compte Certis pour recuperer la montre.
                        </Text>
                    </View>

                    {transferNonce ? (
                        <>
                            <View style={styles.qrWrap}>
                                <QRCode value={getTransferQrValue()} size={220} />
                            </View>
                            <Text style={[styles.countdown, { color: getCountdownColor(transferSecondsLeft) }]}>
                                {transferSecondsLeft}s
                            </Text>
                        </>
                    ) : null}

                    <Button mode="outlined" onPress={generateTransferNonce} style={styles.transferButton}>
                        {transferNonce ? 'Régénérer le QR de transfert' : 'Générer le QR de transfert'}
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

