import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import BrandLogo from '../components/BrandLogo';
import { sharedStyles } from './shared.styles';
import { palette, radius, spacing } from '../theme/tokens';
import { ACCESS_TOKEN_KEY } from '../lib/auth';
import api from '../lib/api';

export default function IndexScreen() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
            if (!token) {
                if (!cancelled) setChecking(false);
                return;
            }

            try {
                await api.get('/auth-test');
                if (!cancelled) router.replace('/dashboard');
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
                    if (!cancelled) setChecking(false);
                    return;
                }

                if (!cancelled) router.replace('/dashboard');
            }
        };

        checkSession();

        return () => {
            cancelled = true;
        };
    }, []);

    if (checking) {
        return (
            <View style={sharedStyles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={[sharedStyles.screenContainer, styles.container]}>
            <View style={styles.heroCard}>
                <View style={styles.logoWrap}>
                    <BrandLogo size={84} />
                </View>
                <Text variant="headlineMedium" style={styles.brandName}>Audemars Piguet</Text>
                <Text variant="titleMedium" style={styles.title}>
                    Registre d'authenticité horlogère
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                    Suivez, authentifiez et transmettez chaque pièce dans un parcours sécurisé.
                </Text>
            </View>

            <Button
                mode="contained"
                onPress={() => router.push('/login')}
                style={styles.primaryButton}
            >
                Se connecter
            </Button>
            <Button
                mode="contained-tonal"
                onPress={() => router.push('/register')}
                style={styles.secondaryButton}
            >
                Créer un compte
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' },
    heroCard: {
        width: '100%',
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: radius.lg,
        backgroundColor: palette.surfaceElevated,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    logoWrap: {
        width: 94,
        height: 94,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        marginBottom: spacing.md,
    },
    brandName: {
        color: palette.primaryGoldSoft,
        marginBottom: spacing.xs,
        fontWeight: '700',
    },
    title: {
        color: palette.textStrong,
        marginBottom: spacing.sm,
        fontWeight: '700',
    },
    subtitle: {
        color: palette.neutralText,
        lineHeight: 22,
    },
    primaryButton: { width: '100%', marginBottom: spacing.md },
    secondaryButton: { width: '100%' },
});
