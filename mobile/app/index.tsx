import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, FAB, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import api from '../lib/api';

type Asset = {
    id: string;
    name: string;
    brand: string;
    model: string;
    reference: string;
    status: string;
    ownerId: string;
};

export default function DashboardScreen() {
    const router = useRouter();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/assets')
            .then(res => setAssets(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={styles.title}>Certis</Text>
            <FlatList
                data={assets}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <Card
                        style={styles.card}
                        onPress={() => router.push(`/asset/${item.id}`)}
                    >
                        <Card.Content>
                            <Text variant="titleMedium">{item.brand} — {item.model}</Text>
                            <Text variant="bodySmall">{item.reference}</Text>
                            <Text variant="bodySmall" style={styles.status}>{item.status}</Text>
                        </Card.Content>
                    </Card>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff', paddingTop: 60 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { marginBottom: 16, fontWeight: 'bold' },
    card: { marginBottom: 12 },
    status: { marginTop: 4, color: '#888' },
});