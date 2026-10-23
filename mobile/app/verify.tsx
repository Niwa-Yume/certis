import { useEffect, useState } from 'react';
import { View } from 'react-native';
import axios from 'axios';
import { Text, ActivityIndicator, Icon } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import api from '../lib/api';
import BrandLogo from '../components/BrandLogo';
import { palette } from '../theme/tokens';
import { styles } from './verify.styles';

// Trois issues distinctes : une erreur technique ne doit jamais se lire « non authentique » (AUDIT N2).
type Outcome =
    | { state: 'loading' }
    | { state: 'authentic' }
    | { state: 'not-authentic' }
    | { state: 'unverifiable'; reason: string };

const VIEW = {
    authentic: {
        icon: 'check-decagram',
        color: palette.success,
        background: palette.successSoft,
        title: 'Montre authentique',
        text: 'La signature cryptographique correspond aux données enregistrées.',
    },
    'not-authentic': {
        icon: 'close-octagon',
        color: palette.danger,
        background: palette.dangerSoft,
        title: 'Authenticité non confirmée',
        text: 'La signature ne correspond pas aux données enregistrées.',
    },
    unverifiable: {
        icon: 'help-circle-outline',
        color: palette.warning,
        background: palette.background,
        title: 'Vérification impossible',
        text: '',
    },
} as const;

function reasonFrom(error: unknown): string {
    if (axios.isAxiosError(error)) {
        if (!error.response) return 'Serveur injoignable. Vérifiez la connexion puis rescannez le QR.';
        const { status } = error.response;
        if (status === 410) return 'Ce QR a expiré ou a déjà servi. Demandez-en un nouveau au propriétaire.';
        if (status === 400 || status === 403 || status === 404) return 'Ce QR ne correspond pas à cette montre.';
        if (status === 429) return 'Trop de vérifications en peu de temps. Réessayez dans une minute.';
    }
    return 'Erreur inattendue pendant la vérification.';
}

export default function VerifyScreen() {
    const { id, nonce } = useLocalSearchParams<{ id: string; nonce: string }>();
    const [outcome, setOutcome] = useState<Outcome>({ state: 'loading' });

    useEffect(() => {
        if (!id || !nonce) {
            setOutcome({ state: 'unverifiable', reason: 'QR incomplet : rescannez-le.' });
            return;
        }
        // Route publique : aucun compte n'est nécessaire pour vérifier.
        api.post(`/assets/${id}/authenticate`, { nonce })
            .then(res => setOutcome({ state: res.data.valid ? 'authentic' : 'not-authentic' }))
            .catch(error => setOutcome({ state: 'unverifiable', reason: reasonFrom(error) }));
    }, [id, nonce]);

    if (outcome.state === 'loading') {
        return (
            <View style={styles.centered}>
                <BrandLogo size={50} />
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Vérification en cours...</Text>
            </View>
        );
    }

    const view = VIEW[outcome.state];
    return (
        <View style={[styles.centered, { backgroundColor: view.background }]}>
            <BrandLogo size={50} />
            <View style={styles.icon}>
                <Icon source={view.icon} size={72} color={view.color} />
            </View>
            <Text variant="headlineMedium" style={[styles.result, { color: view.color }]}>
                {view.title}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
                {outcome.state === 'unverifiable' ? outcome.reason : view.text}
            </Text>
        </View>
    );
}
