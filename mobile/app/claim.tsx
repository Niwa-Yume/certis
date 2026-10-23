import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import api from '../lib/api';
import BrandLogo from '../components/BrandLogo';
import { sharedStyles } from './shared.styles';
import { palette, spacing } from '../theme/tokens';

export default function ClaimScreen() {
    const { id, nonce } = useLocalSearchParams<{ id: string; nonce: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClaim = async () => {
        setLoading(true);
        setError(null);
        try {
            await api.post(`/assets/${id}/claim`, { nonce });
            setClaimed(true);
        } catch (e) {
            // Le serveur dit pourquoi (offre réservée, déjà propriétaire, QR expiré…) : on l'affiche.
            const message = axios.isAxiosError(e) ? e.response?.data?.message : undefined;
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                setError('Connectez-vous pour recevoir cette montre, puis rescannez le QR.');
            } else {
                setError(typeof message === 'string' ? message : 'Transfert impossible pour le moment.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (claimed) {
        return (
            <View style={[sharedStyles.centered, { backgroundColor: palette.successSoft }]}>
                <View style={{ marginBottom: spacing.lg }}>
                    <BrandLogo size={68} />
                </View>
                <Text style={{ fontSize: 72, marginBottom: spacing.lg }}>✅</Text>
                <Text variant="headlineMedium" style={{ fontWeight: '700', color: palette.success, marginBottom: spacing.sm, textAlign: 'center' }}>
                    Montre reçue !
                </Text>
                <Text variant="bodyMedium" style={{ color: palette.neutralText, textAlign: 'center', marginBottom: spacing.xl }}>
                    La montre a été transférée sur ton compte.
                </Text>
                <Button mode="contained" onPress={() => router.replace({ pathname: '/dashboard', params: { refresh: Date.now().toString() } })}>
                    Voir mes montres
                </Button>
            </View>
        );
    }

    return (
        <View style={sharedStyles.screenContainer}>
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                <BrandLogo size={72} />
            </View>
            <Text variant="headlineMedium" style={sharedStyles.screenTitle}>
                Réception d'une montre
            </Text>
            <Text variant="bodyMedium" style={{ color: palette.neutralText, marginBottom: spacing.xl }}>
                Tu es sur le point de récupérer la propriété d'une montre certifiée.
                Confirme pour l'ajouter à ton compte.
            </Text>
            {error && (
                <Text style={{ color: palette.danger, marginBottom: spacing.md }}>{error}</Text>
            )}
            <Button
                mode="contained"
                onPress={handleClaim}
                loading={loading}
                disabled={loading}
                style={{ marginBottom: spacing.md }}
            >
                Confirmer la réception
            </Button>
            <Button mode="outlined" onPress={() => router.replace('/dashboard')}>
                Annuler
            </Button>
        </View>
    );
}
