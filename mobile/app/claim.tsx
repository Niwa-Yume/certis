import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../lib/api';
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
        } catch {
            setError('Transfert impossible. Le QR est peut-être expiré ou déjà utilisé.');
        } finally {
            setLoading(false);
        }
    };

    if (claimed) {
        return (
            <View style={[sharedStyles.centered, { backgroundColor: palette.successSoft }]}>
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
            <Text variant="headlineMedium" style={sharedStyles.screenTitle}>
                Réception d'une montre
            </Text>
            <Text variant="bodyMedium" style={{ color: palette.neutralText, marginBottom: spacing.xl }}>
                Tu es sur le point de récupérer la propriété d'une montre Certis.
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

