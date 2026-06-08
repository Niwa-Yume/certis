import { useState } from 'react';
import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import api from '../lib/api';
import { sharedStyles } from './shared.styles';
import { ACCESS_TOKEN_KEY } from './index';

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
            <Text variant="headlineMedium" style={sharedStyles.screenTitle}>Connexion</Text>
            <TextInput
                mode="outlined"
                label="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={{ marginBottom: 12 }}
            />
            <TextInput
                mode="outlined"
                label="Mot de passe"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={{ marginBottom: 4 }}
            />
            <HelperText type="error" visible={Boolean(error)}>
                {error ?? ' '}
            </HelperText>
            <Button mode="contained" onPress={submit} loading={loading} disabled={loading}>
                Se connecter
            </Button>
            <Link href="/register" asChild>
                <Button mode="text" style={{ marginTop: 12 }}>
                    Pas encore de compte ? S'inscrire
                </Button>
            </Link>
        </View>
    );
}

