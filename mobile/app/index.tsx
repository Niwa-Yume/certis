import { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../lib/api';
import watchImages from '../lib/watchImages';
import BrandLogo from '../components/BrandLogo';
import { styles } from './index.styles';

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
    const { refresh } = useLocalSearchParams<{ refresh?: string }>();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get('/assets')
            .then(res => setAssets(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [refresh]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <BrandLogo size={44} />
                <Text variant="headlineMedium" style={styles.title}>Certis</Text>
            </View>
            <Button
                mode="contained"
                icon="plus"
                onPress={() => router.push('/watch/new')}
                style={styles.addButton}
            >
                Ajouter une montre
            </Button>
            <FlatList
                data={assets}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <Card
                        style={styles.card}
                        onPress={() => router.push(`/watch/${item.id}`)}
                    >
                        {watchImages[item.reference] && (
                            <Card.Cover source={watchImages[item.reference]} style={styles.watchImage} />
                        )}
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
