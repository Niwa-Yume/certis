import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import api from '../lib/api';
import { sharedStyles } from './shared.styles';
import { ACCESS_TOKEN_KEY } from './index';
import BrandLogo from '../components/BrandLogo';
import { palette, radius, spacing } from '../theme/tokens';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (!email || !password) {
            setError('Email et mot de passe sont obligatoires.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', { email, password });
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.accessToken);
            router.replace('/dashboard');
        } catch {
            setError('Connexion impossible, verifie tes identifiants.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={sharedStyles.screenContainer}>
            <View style={styles.header}>
                <BrandLogo size={42} />
                <Text variant="headlineMedium" style={styles.title}>Espace privé</Text>
            </View>
            <Text variant="bodyMedium" style={styles.subtitle}>
                Connectez-vous pour accéder à votre collection certifiée.
            </Text>

            <View style={styles.card}>
                <TextInput
                    mode="outlined"
                    label="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                />
                <TextInput
                    mode="outlined"
                    label="Mot de passe"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    style={styles.passwordInput}
                />
                <HelperText type="error" visible={Boolean(error)}>
                    {error ?? ' '}
                </HelperText>
                <Button mode="contained" onPress={submit} loading={loading} disabled={loading}>
                    Se connecter
                </Button>
            </View>

            <Link href="/register" asChild>
                <Button mode="text" style={styles.linkButton}>
                    Pas encore de compte ? S'inscrire
                </Button>
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    title: { color: palette.textStrong, fontWeight: '700' },
    subtitle: { color: palette.neutralText, marginBottom: spacing.lg },
    card: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: radius.lg,
        backgroundColor: palette.surfaceElevated,
        padding: spacing.md,
    },
    input: { marginBottom: spacing.sm },
    passwordInput: { marginBottom: spacing.xs },
    linkButton: { marginTop: spacing.md },
});

