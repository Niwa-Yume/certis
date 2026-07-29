import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import api from '../lib/api';
import { sharedStyles } from './shared.styles';
import BrandLogo from '../components/BrandLogo';
import { palette, radius, spacing } from '../theme/tokens';

export default function RegisterScreen() {
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
            await api.post('/auth/register', { email, password });
            router.replace('/login');
        } catch {
            setError('Inscription impossible, cet email existe peut-etre deja.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={sharedStyles.screenContainer}>
            <View style={styles.header}>
                <BrandLogo size={42} />
                <Text variant="headlineMedium" style={styles.title}>Créer un compte</Text>
            </View>
            <Text variant="bodyMedium" style={styles.subtitle}>
                Créez votre espace sécurisé pour gérer vos pièces horlogères.
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
                    Créer mon compte
                </Button>
            </View>

            <Link href="/login" asChild>
                <Button mode="text" style={styles.linkButton}>
                    Déjà un compte ? Se connecter
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
