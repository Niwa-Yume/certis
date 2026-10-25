import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import api, { explain } from '../../lib/api';
import { splitName } from '../../lib/format';
import { Button, Container, Glow, Icon, Notice, PieceName, Seal, TextField, t, transition, useLayout, web } from '../../components/ui';
import { color, space } from '../../theme/tokens';

const FIELDS = ['brand', 'model', 'reference', 'name', 'serial', 'movement', 'case', 'dial', 'bracelet', 'imageUrl', 'ownerEmail'] as const;
type Form = Record<(typeof FIELDS)[number], string>;
const EMPTY = Object.fromEntries(FIELDS.map((field) => [field, ''])) as Form;

/** Une référence du catalogue (GET /catalog) : sourcée sur le site de la marque. */
type Entry = {
    brand: string; model: string; name: string; reference: string;
    movement: string; case: string; dial: string; bracelet: string; source: string;
    photo?: { imageUrl: string; imageCutout: boolean };
};

const matches = (entry: Entry, query: string) =>
    query.split(/\s+/).every((word) => `${entry.brand} ${entry.model} ${entry.name} ${entry.reference} ${entry.dial}`.toLowerCase().includes(word));

// Les copier-coller depuis un site marchand embarquent souvent des espaces invisibles.
const clean = (value: string) => value.replace(/[\u200B-\u200D\u2060\uFEFF\u00A0]/g, ' ').trim();

/** Réservé aux émetteurs (ADR-0003) : ils signent le passeport de la pièce qu'ils ont examinée. */
export default function NewWatchScreen() {
    const router = useRouter();
    const { wide } = useLayout();
    const [form, setForm] = useState<Form>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [handedTo, setHandedTo] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<Entry[]>([]);
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<Entry | null>(null);
    const set = (field: keyof Form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

    // Sans catalogue (réseau), le formulaire reste utilisable à la main.
    useEffect(() => { api.get('/catalog').then((res) => setCatalog(res.data), () => undefined); }, []);
    const results = useMemo(() => {
        const q = clean(query).toLowerCase();
        return q.length < 2 ? [] : catalog.filter((entry) => matches(entry, q)).slice(0, 10);
    }, [catalog, query]);

    const pick = (entry: Entry) => {
        setForm((f) => ({
            ...f,
            brand: entry.brand, model: entry.model, name: entry.name, reference: entry.reference,
            movement: entry.movement, case: entry.case, dial: entry.dial, bracelet: entry.bracelet,
            imageUrl: entry.photo?.imageUrl ?? '',
        }));
        setPicked(entry);
        setQuery('');
        setError(null);
    };

    const back = () => (router.canGoBack() ? router.back() : router.replace('/dashboard'));

    const submit = async () => {
        const data = Object.fromEntries(FIELDS.map((k) => [k, clean(form[k])]).filter(([, v]) => v)) as Partial<Form>;
        if (!data.brand || !data.model || !data.reference || !data.name || !data.serial) {
            return setError('Champs obligatoires manquants : renseignez la marque, le modèle, la référence, le nom et le numéro de série.');
        }
        if (data.imageUrl && !/^(https?:\/\/|\/public\/)/.test(data.imageUrl)) {
            return setError('Adresse de photo refusée : elle doit commencer par https://');
        }
        setLoading(true);
        setError(null);
        try {
            // Une photo reprise du catalogue est détourée ou non : on garde cette indication.
            const cutout = picked?.photo && data.imageUrl === picked.photo.imageUrl ? { imageCutout: picked.photo.imageCutout } : {};
            const res = await api.post('/assets', { ...data, ...cutout });
            // Remise à son acheteur : la pièce quitte le stock de l'émetteur.
            if (data.ownerEmail) {
                setHandedTo(data.ownerEmail);
                setForm(EMPTY);
                setPicked(null);
            } else {
                router.replace(`/watch/${res.data.id}`);
            }
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401) return router.replace('/login');
            setError(explain(e, 'Inscription impossible pour le moment : réessayez dans un instant.'));
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
                            <Text style={[t.body, t.medium]}>Stock de l’atelier</Text>
                        </Pressable>
                        <View style={{ gap: 8 }}>
                            <Text style={t.caps}>INSCRIPTION AU REGISTRE</Text>
                            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { fontSize: 48, lineHeight: 50 }]}>Inscrire une pièce</Text>
                            <Text style={[t.body, { color: color.slate }]}>
                                Vous signez son passeport avec votre clé : il ne pourra plus être modifié sans briser le sceau. Vérifiez chaque champ sur la pièce et ses papiers.
                            </Text>
                        </View>

                        {handedTo ? (
                            <Notice tone="verified" message={`Pièce inscrite et remise à ${handedTo} : elle apparaît dans sa collection, avec son passeport et sa provenance.`} />
                        ) : null}

                        <Text style={[t.label, t.strong, styles.group]}>DEPUIS LE CATALOGUE</Text>
                        <TextField
                            label="Rechercher une référence"
                            value={query}
                            onChangeText={setQuery}
                            placeholder="ex. Royal Oak noir, 126610LN, Nautilus"
                            autoCapitalize="none"
                            hint={catalog.length ? `${catalog.length} références relevées sur le site des marques. Elles remplissent la fiche ; il ne reste que le numéro de série.` : undefined}
                        />
                        {results.length ? (
                            <View accessibilityRole="list" style={styles.results}>
                                {results.map((entry) => (
                                    <Pressable
                                        key={entry.reference}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Reprendre ${entry.brand} ${entry.name}, référence ${entry.reference}`}
                                        onPress={() => pick(entry)}
                                        style={(state) => [styles.result, (state as { hovered?: boolean }).hovered && styles.resultHover, transition('background-color')]}
                                    >
                                        <Text style={[t.body, t.strong]}>{entry.brand} · {entry.name}</Text>
                                        <Text style={t.small}>{entry.reference} · {entry.dial}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : clean(query).length >= 2 && catalog.length ? (
                            <Notice tone="info" message="Aucune référence ne correspond : essayez la marque, le modèle ou la référence seule, ou remplissez la fiche à la main." />
                        ) : null}
                        {picked ? (
                            <Notice
                                tone="info"
                                message={`Fiche reprise du catalogue : vérifiez chaque champ sur la pièce et ses papiers, puis saisissez son numéro de série. Source : ${new URL(picked.source).hostname.replace(/^www\./, '')}.`}
                            />
                        ) : null}

                        <Text style={[t.label, t.strong, styles.group]}>LA PIÈCE</Text>
                        <TextField label="Marque" value={form.brand} onChangeText={set('brand')} placeholder="ex. TAG Heuer" />
                        <TextField label="Modèle" value={form.model} onChangeText={set('model')} placeholder="ex. Carrera" />
                        <TextField label="Référence" value={form.reference} onChangeText={set('reference')} placeholder="ex. CV7A12.BA0795" autoCapitalize="characters" />
                        <TextField label="Nom de la pièce" value={form.name} onChangeText={set('name')} placeholder="ex. Carrera Calibre S" hint="Tel qu’il apparaîtra sur le certificat." />
                        <TextField
                            label="Numéro de série"
                            value={form.serial}
                            onChangeText={set('serial')}
                            autoCapitalize="characters"
                            hint="Gravé sur le boîtier. Certis n’en garde qu’une empreinte : l’acheteur pourra le comparer, personne ne pourra le lire."
                        />

                        <Text style={[t.label, t.strong, styles.group]}>CARACTÉRISTIQUES (FACULTATIF)</Text>
                        <TextField label="Mouvement" value={form.movement} onChangeText={set('movement')} placeholder="ex. TAG Heuer Calibre S" />
                        <TextField label="Boîtier" value={form.case} onChangeText={set('case')} placeholder="ex. Acier, 43 mm" />
                        <TextField label="Cadran" value={form.dial} onChangeText={set('dial')} placeholder="ex. Noir" />
                        <TextField label="Bracelet" value={form.bracelet} onChangeText={set('bracelet')} placeholder="ex. Acier" />
                        <TextField label="Photo" value={form.imageUrl} onChangeText={set('imageUrl')} placeholder="https://" autoCapitalize="none" keyboardType="url" />

                        <Text style={[t.label, t.strong, styles.group]}>REMISE (FACULTATIF)</Text>
                        <TextField
                            label="E-mail du premier propriétaire"
                            value={form.ownerEmail}
                            onChangeText={set('ownerEmail')}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            hint="À la vente : la pièce est inscrite directement à son nom. Sinon, elle reste dans votre stock, et vous la cédez plus tard avec un QR."
                        />
                        {error ? <Notice message={error} /> : null}
                        <Button label="Signer et inscrire" arrow loading={loading} onPress={submit} />
                    </View>

                    {/* Aperçu du certificat, mis à jour à la frappe. */}
                    <View aria-hidden style={[styles.preview, wide ? web({ position: 'sticky', top: 40 }) : null]}>
                        <Glow />
                        <Text style={[t.caps, { color: color.mist }]}>{clean(form.brand).toUpperCase() || 'MARQUE'}</Text>
                        <PieceName parts={splitName(name)} size={40} accent={color.gold} style={{ color: color.paper }} />
                        <Text style={[t.ref, { color: color.paper, fontSize: 14 }]}>{clean(form.reference) || 'RÉFÉRENCE'}</Text>
                        {clean(form.movement) ? <Text style={[t.small, { color: color.mist }]}>{clean(form.movement)}</Text> : null}
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
    group: { letterSpacing: 1.6, marginTop: space.sm, color: color.slate },
    results: { borderWidth: 1, borderColor: color.hairline, backgroundColor: color.card },
    result: { gap: 2, paddingVertical: 10, paddingHorizontal: space.md, borderBottomWidth: 1, borderColor: color.hairline, minHeight: 44 },
    resultHover: { backgroundColor: color.hover },
    preview: { flex: 1, width: '100%', maxWidth: 480, minHeight: 300, padding: space.lg, gap: 10, backgroundColor: color.seal, overflow: 'hidden', marginTop: 92 },
});
