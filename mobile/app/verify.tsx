import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import api from '../lib/api';

export default function VerifyScreen() {
    const { id, nonce } = useLocalSearchParams<{ id: string; nonce: string }>();
    const [valid, setValid] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/assets/${id}/authenticate`, { params: { nonce } })
            .then(res => setValid(res.data.valid))
            .catch(() => setValid(false))
            .finally(() => setLoading(false));
    }, [id, nonce]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Vérification en cours...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.centered, { backgroundColor: valid ? '#e8f5e9' : '#ffebee' }]}>
            <Text style={styles.icon}>{valid ? '✅' : '❌'}</Text>
            <Text variant="headlineMedium" style={[styles.result, { color: valid ? '#2e7d32' : '#c62828' }]}>
                {valid ? 'Montre authentique' : 'Authenticité invalide'}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
                {valid
                    ? 'La signature cryptographique est valide.'
                    : 'La signature ne correspond pas aux données enregistrées.'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    icon: { fontSize: 80, marginBottom: 24 },
    result: { fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    subtitle: { textAlign: 'center', color: '#555' },
    loadingText: { marginTop: 16, color: '#888' },
});