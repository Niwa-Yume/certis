import { useState, useCallback } from 'react';
import { View, FlatList } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';
import watchImages from '../lib/watchImages';
import BrandLogo from '../components/BrandLogo';
import { styles } from './index.styles';
import { ACCESS_TOKEN_KEY } from './index';
import { palette } from '../theme/tokens';

type Asset = {
    id: string;
    name: string;
    brand: string;
    model: string;
    reference: string;
    status: string;
    ownerId: string;
    imageUrl?: string;
};

export default function DashboardScreen() {
    const router = useRouter();
    const { refresh } = useLocalSearchParams<{ refresh?: string }>();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAssets = useCallback(() => {
        let cancelled = false;
        setLoading(true);

        api.get('/assets')
            .then((res) => {
                if (!cancelled) setAssets(res.data);
            })
            .catch(console.error)
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [refresh]);

    useFocusEffect(
        useCallback(() => loadAssets(), [loadAssets]),
    );

    const logout = async () => {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        router.replace('/');
    };

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
                <Button mode="text" onPress={logout} style={{ marginLeft: 'auto' }}>
                    Déconnexion
                </Button>
            </View>

            <View style={styles.hero}>
                <Text variant="labelLarge" style={styles.collectionTag}>Collection privee</Text>
                <Text variant="titleLarge">{assets.length} pièce{assets.length > 1 ? 's' : ''} certifiée{assets.length > 1 ? 's' : ''}</Text>
                <Text variant="bodyMedium" style={{ color: palette.neutralText, marginTop: 6 }}>
                    Chaque actif dispose d'une preuve cryptographique, traçable en quelques secondes.
                </Text>
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
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={(
                    <View style={styles.emptyCard}>
                        <Text variant="titleMedium">Votre collection est vide</Text>
                        <Text variant="bodyMedium" style={styles.emptyHint}>
                            Créez votre premier actif pour démarrer une expérience premium de certification.
                        </Text>
                    </View>
                )}
                renderItem={({ item }) => (
                    <Card
                        style={styles.card}
                        onPress={() => router.push(`/watch/${item.id}`)}
                    >
                        {(item.imageUrl || watchImages[item.reference]) && (
                            <Card.Cover
                                source={item.imageUrl ? { uri: item.imageUrl } : watchImages[item.reference]}
                                style={styles.watchImage}
                            />
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
