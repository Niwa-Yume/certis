import { useState } from 'react';
import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import api from '../lib/api';
import { sharedStyles } from './shared.styles';

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
            <Text variant="headlineMedium" style={sharedStyles.screenTitle}>Inscription</Text>
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
                Creer mon compte
            </Button>
            <Link href="/login" asChild>
                <Button mode="text" style={{ marginTop: 12 }}>
                    Deja un compte ? Se connecter
                </Button>
            </Link>
        </View>
    );
}

