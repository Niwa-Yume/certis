import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import api from '../../lib/api';
import { splitName } from '../../lib/format';
import { Button, Container, Glow, Icon, PieceName, Seal, TextField, t, useLayout, web } from '../../components/ui';
import { color, space } from '../../theme/tokens';

type Form = { brand: string; model: string; reference: string; name: string; imageUrl: string };
const EMPTY: Form = { brand: '', model: '', reference: '', name: '', imageUrl: '' };

// Les copier-coller depuis un site marchand embarquent souvent des espaces invisibles.
const clean = (value: string) => value.replace(/[​-‍⁠﻿ ]/g, ' ').trim();

export default function NewWatchScreen() {
    const router = useRouter();
    const { wide } = useLayout();
    const [form, setForm] = useState<Form>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = (field: keyof Form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

    const back = () => (router.canGoBack() ? router.back() : router.replace('/dashboard'));

    const submit = async () => {
        const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, clean(v)])) as Form;
        if (!data.brand || !data.model || !data.reference || !data.name) return setError('Marque, modèle, référence et nom sont obligatoires.');
        if (data.imageUrl && !/^https?:\/\//.test(data.imageUrl)) return setError('L’adresse de la photo doit commencer par https://');
        setLoading(true);
        setError(null);
        try {
            const { imageUrl, ...rest } = data;
            const res = await api.post('/assets', imageUrl ? { ...rest, imageUrl } : rest);
            router.replace(`/watch/${res.data.id}`);
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401) return router.replace('/login');
            setError(axios.isAxiosError(e) && e.response?.status === 400
                ? 'Un champ n’est pas valide. Vérifiez les longueurs et l’adresse de la photo.'
                : 'Inscription impossible pour le moment. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };

    const name = clean(form.name) || 'Nom de la pièce';
    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.paper }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 72 }}>
                <Container style={[styles.layout, { flexDirection: wide ? 'row' : 'column' }]}>
                    <View style={styles.form}>
                        <Pressable onPress={back} accessibilityRole="link" style={styles.back}>
                            <Icon name="back" size={18} />
                            <Text style={[t.body, t.medium]}>Ma collection</Text>
                        </Pressable>
                        <View style={{ gap: 8 }}>
                            <Text style={t.caps}>INSCRIPTION AU REGISTRE</Text>
                            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { fontSize: 48, lineHeight: 50 }]}>Inscrire une pièce</Text>
                            <Text style={[t.body, { color: color.slate }]}>
                                Certis signe ces informations : une fois inscrites, toute modification briserait le sceau. Vérifiez-les sur la pièce et ses papiers.
                            </Text>
                        </View>
                        <TextField label="Marque" value={form.brand} onChangeText={set('brand')} placeholder="ex. TAG Heuer" />
                        <TextField label="Modèle" value={form.model} onChangeText={set('model')} placeholder="ex. Carrera" />
                        <TextField label="Référence" value={form.reference} onChangeText={set('reference')} placeholder="ex. CV7A12.BA0795" autoCapitalize="characters" />
                        <TextField
                            label="Nom de la pièce"
                            value={form.name}
                            onChangeText={set('name')}
                            placeholder="ex. Carrera Calibre S"
                            hint="Tel qu’il apparaîtra sur le certificat."
                        />
                        <TextField
                            label="Photo (facultatif)"
                            value={form.imageUrl}
                            onChangeText={set('imageUrl')}
                            placeholder="https://"
                            autoCapitalize="none"
                            keyboardType="url"
                            error={error}
                        />
                        <Button label="Inscrire au registre" arrow loading={loading} onPress={submit} />
                    </View>

                    {/* Aperçu du certificat, mis à jour à la frappe. */}
                    <View aria-hidden style={[styles.preview, wide ? web({ position: 'sticky', top: 40 }) : null]}>
                        <Glow />
                        <Text style={[t.caps, { color: color.mist }]}>{clean(form.brand).toUpperCase() || 'MARQUE'}</Text>
                        <PieceName parts={splitName(name)} size={40} accent={color.gold} style={{ color: color.paper }} />
                        <Text style={[t.ref, { color: color.paper, fontSize: 14 }]}>{clean(form.reference) || 'RÉFÉRENCE'}</Text>
                        <View style={{ alignSelf: 'flex-end', marginTop: space.lg }}>
                            <Seal number="APERÇU" size={88} />
                        </View>
                    </View>
                </Container>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    layout: { gap: space.xl, paddingTop: space.lg, alignItems: 'flex-start' },
    form: { flex: 1, width: '100%', maxWidth: 520, gap: space.lg },
    back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
    preview: { flex: 1, width: '100%', maxWidth: 480, minHeight: 300, padding: space.lg, gap: 10, backgroundColor: color.seal, overflow: 'hidden', marginTop: 92 },
});
