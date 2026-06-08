import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../lib/api';

export default function TransferScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [toOwnerId, setToOwnerId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const goBack = () => {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace('/');
    };

    const handleTransfer = async () => {
        if (!toOwnerId.trim()) {
            setError('Veuillez entrer un identifiant de propriétaire');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await api.post(`/assets/${id}/transfer`, { toOwnerId });
            setSuccess(true);
        } catch (e) {
            setError('Erreur lors du transfert');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <View style={styles.centered}>
                <Text style={styles.icon}>✅</Text>
                <Text variant="headlineSmall" style={styles.successText}>
                    Transfert effectué
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                    La montre a été transférée à {toOwnerId}
                </Text>
                <Button
                    mode="contained"
                    onPress={() => router.replace({ pathname: '/dashboard', params: { refresh: Date.now().toString() } })}
                    style={styles.button}
                >
                    Retour au dashboard
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Button mode="text" icon="arrow-left" onPress={goBack} style={styles.backButton}>
                Retour
            </Button>
            <Text variant="headlineMedium" style={styles.title}>
                    Transfert de propriete
                </Text>

            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="bodyMedium" style={styles.hint}>
                        Entrez l'identifiant du nouveau propriétaire
                    </Text>
                    <TextInput
                        label="Nouveau propriétaire"
                        value={toOwnerId}
                        onChangeText={setToOwnerId}
                        mode="outlined"
                        style={styles.input}
                        autoCapitalize="none"
                    />
                    {error && (
                        <Text style={styles.error}>{error}</Text>
                    )}
                    <Button
                        mode="contained"
                        onPress={handleTransfer}
                        loading={loading}
                        style={styles.button}
                    >
                        Transférer
                    </Button>
                    <Button mode="outlined" onPress={goBack} style={styles.cancelButton}>
                        Annuler
                    </Button>
                </Card.Content>
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff', paddingTop: 60 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    backButton: { alignSelf: 'flex-start', marginBottom: 8 },
    title: { marginBottom: 16, fontWeight: 'bold' },
    card: { marginBottom: 16, backgroundColor: '#fff' },
    hint: { color: '#888', marginBottom: 12 },
    input: { marginBottom: 16 },
    error: { color: '#c62828', marginBottom: 12 },
    button: { marginTop: 8 },
    cancelButton: { marginTop: 8 },
    icon: { fontSize: 64, marginBottom: 16 },
    successText: { fontWeight: 'bold', marginBottom: 8 },
    subtitle: { color: '#555', textAlign: 'center', marginBottom: 24 },
});