import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import BrandLogo from '../components/BrandLogo';
import { sharedStyles } from './shared.styles';
import { palette, spacing } from '../theme/tokens';

export const ACCESS_TOKEN_KEY = 'certis_access_token';

export default function IndexScreen() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY).then((token) => {
            if (token) {
                router.replace('/dashboard');
            } else {
                setChecking(false);
            }
        });
    }, []);

    if (checking) {
        return (
            <View style={sharedStyles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={[sharedStyles.screenContainer, { alignItems: 'center', justifyContent: 'center' }]}>
            <BrandLogo size={80} />
            <Text variant="headlineMedium" style={{ marginTop: spacing.lg, marginBottom: spacing.sm, fontWeight: '700', color: palette.textStrong }}>
                Certis
            </Text>
            <Text variant="bodyMedium" style={{ color: palette.neutralText, marginBottom: spacing.xl, textAlign: 'center' }}>
                Authentifiez vos montres de luxe via ECDSA
            </Text>
            <Button
                mode="contained"
                onPress={() => router.push('/login')}
                style={{ width: '100%', marginBottom: spacing.md }}
            >
                Se connecter
            </Button>
            <Button
                mode="outlined"
                onPress={() => router.push('/register')}
                style={{ width: '100%' }}
            >
                Créer un compte
            </Button>
        </View>
    );
}
