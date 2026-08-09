import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import BrandLogo from '../../components/BrandLogo';
import { styles } from './new.styles';

type FormState = {
  name: string;
  brand: string;
  model: string;
  reference: string;
};

const initialForm: FormState = { name: '', brand: '', model: '', reference: '' };

export default function NewWatchScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/dashboard');
  };

  const goToDashboardWithRefresh = () => {
    router.replace(`/dashboard?refresh=${Date.now()}`);
  };

  const handleCreateWatch = async () => {
    const { name, brand, model, reference } = form;
    if (!name.trim() || !brand.trim() || !model.trim() || !reference.trim()) {
      setError('Tous les champs texte sont obligatoires.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/assets', {
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        reference: reference.trim(),
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
      });
      setSuccess(true);
      setForm(initialForm);
      setImageUrl('');
    } catch (requestError) {
      console.error(requestError);
      setError("Impossible d'ajouter la montre. Verifie la connexion API.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successIcon}>✅</Text>
        <Text variant="headlineSmall" style={styles.successText}>Montre ajoutée</Text>
        <Text variant="bodyMedium" style={styles.successHint}>
          La montre est maintenant enregistrée sur ton compte.
        </Text>
        <Button mode="contained" onPress={goToDashboardWithRefresh}>
          Retour à la liste
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Button mode="text" icon="arrow-left" onPress={goBack} style={styles.backButton}>
        Retour
      </Button>
      <View style={styles.headerRow}>
        <BrandLogo size={40} />
        <Text variant="headlineMedium" style={styles.title}>Ajouter une montre</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="bodyMedium" style={styles.hint}>
            La montre sera automatiquement liée à ton compte.
          </Text>

          <TextInput label="Nom de la montre" value={form.name} onChangeText={(v) => updateField('name', v)} mode="outlined" style={styles.input} />
          <TextInput label="Marque" value={form.brand} onChangeText={(v) => updateField('brand', v)} mode="outlined" style={styles.input} />
          <TextInput label="Modele" value={form.model} onChangeText={(v) => updateField('model', v)} mode="outlined" style={styles.input} />
          <TextInput label="Reference" value={form.reference} onChangeText={(v) => updateField('reference', v)} mode="outlined" style={styles.input} autoCapitalize="characters" />
          <TextInput
            label="URL de l'image (optionnel)"
            value={imageUrl}
            onChangeText={setImageUrl}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="url"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button mode="contained" onPress={handleCreateWatch} style={styles.submitButton}>
            Ajouter la montre
          </Button>
          <Button mode="outlined" onPress={goBack} style={styles.cancelButton}>
            Annuler
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
