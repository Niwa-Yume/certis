import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import api from '../lib/api';
import { ACCESS_TOKEN_KEY, safeNext } from '../lib/auth';
import { setItemAsync } from '../lib/storage';
import { SHOWCASE } from './WatchPhoto';
import { color, space } from '../theme/tokens';
import { Button, Glow, Icon, PieceName, Rise, TextField, TextLink, Wordmark, t, useLayout, web } from './ui';

const COPY = {
    login: {
        title: 'Se connecter',
        text: 'Retrouvez votre collection, présentez une pièce à un acheteur ou cédez-la.',
        submit: 'Se connecter',
        switchText: 'Pas encore de compte ?',
        switchLabel: 'Créer un compte',
        switchTo: '/register',
    },
    register: {
        title: 'Créer un compte',
        text: 'Un compte suffit pour inscrire vos pièces au registre et en recevoir.',
        submit: 'Créer mon compte',
        switchText: 'Déjà un compte ?',
        switchLabel: 'Se connecter',
        switchTo: '/login',
    },
} as const;

function reasonFrom(error: unknown, mode: 'login' | 'register'): string {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (!error.response) return 'Serveur injoignable. Vérifiez votre connexion.';
        if (status === 401) return 'E-mail ou mot de passe incorrect.';
        if (status === 409) return 'Un compte existe déjà avec cet e-mail. Connectez-vous.';
        if (status === 429) return 'Trop de tentatives. Patientez une minute, puis réessayez.';
        if (status === 400) return mode === 'register' ? 'Vérifiez l’e-mail, et un mot de passe de 8 caractères minimum.' : 'Vérifiez l’e-mail saisi.';
    }
    return 'Une erreur inattendue est survenue. Réessayez.';
}

/** Connexion et inscription : même écran, même logique ; l'inscription connecte directement. */
export default function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
    const router = useRouter();
    const { next } = useLocalSearchParams<{ next?: string }>();
    const { wide, height } = useLayout();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const copy = COPY[mode];

    const submit = async () => {
        if (!email.trim() || !password) return setError('Saisissez votre e-mail et votre mot de passe.');
        setLoading(true);
        setError(null);
        try {
            const res = await api.post(`/auth/${mode}`, { email: email.trim(), password });
            await setItemAsync(ACCESS_TOKEN_KEY, res.data.accessToken);
            router.replace(safeNext(next) as never);
        } catch (e) {
            setError(reasonFrom(e, mode));
        } finally {
            setLoading(false);
        }
    };

    const form = (
        <View style={styles.form}>
            <Pressable onPress={() => router.replace('/')} accessibilityRole="link" style={styles.back}>
                <Icon name="back" size={18} />
                <Text style={[t.body, t.medium]}>Accueil</Text>
            </Pressable>
            {wide ? null : <Wordmark />}
            <View style={{ gap: 8 }}>
                <Text style={t.caps}>ESPACE PROPRIÉTAIRE</Text>
                <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { fontSize: 48, lineHeight: 50 }]}>{copy.title}</Text>
                <Text style={[t.body, { color: color.slate }]}>{copy.text}</Text>
            </View>
            <TextField
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
            />
            <TextField
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
                hint={mode === 'register' ? '8 caractères minimum.' : undefined}
                onSubmitEditing={submit}
                error={error}
            />
            <Button label={copy.submit} arrow loading={loading} onPress={submit} />
            <View style={styles.switch}>
                <Text style={[t.body, { color: color.slate }]}>{copy.switchText}</Text>
                <TextLink label={copy.switchLabel} onPress={() => router.replace({ pathname: copy.switchTo, params: next ? { next } : {} })} />
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
            {wide ? (
                <View style={[styles.panel, { minHeight: height }]}>
                    <Glow cy="58%" rx="55%" ry="45%" />
                    <View style={{ padding: space.xl }}>
                        <Wordmark tone={color.paper} size={15} />
                    </View>
                    <Rise delay={150} distance={28} scale={0.97} style={styles.panelPhoto}>
                        <Image
                            source={SHOWCASE.source}
                            accessibilityLabel="TAG Heuer Carrera Calibre S"
                            resizeMode="contain"
                            style={[{ width: 250, height: 450 }, web({ filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.45))' })]}
                        />
                    </Rise>
                    <View style={{ padding: space.xl, gap: 8 }}>
                        <PieceName parts={['Le registre', 'des garde-temps']} size={44} accent={color.gold} style={{ color: color.paper }} />
                        <Text style={[t.body, { color: color.mist, maxWidth: 420 }]}>
                            Chaque pièce inscrite porte un certificat signé, vérifiable par tout acheteur, sans compte.
                        </Text>
                    </View>
                </View>
            ) : null}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Rise delay={wide ? 300 : 0} distance={16}>{form}</Rise>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, flexDirection: 'row', backgroundColor: color.paper },
    panel: { flex: 1, backgroundColor: color.seal, overflow: 'hidden', justifyContent: 'space-between' },
    panelPhoto: { alignSelf: 'center' },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg },
    form: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: space.lg },
    back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
    switch: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
});
