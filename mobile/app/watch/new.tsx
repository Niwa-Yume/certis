import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import BrandLogo from '../../components/BrandLogo';
import { styles } from './new.styles';

type CreateWatchPayload = {
  name: string;
  brand: string;
  model: string;
  reference: string;
  ownerId: string;
};

const initialForm: CreateWatchPayload = {
  name: '',
  brand: '',
  model: '',
  reference: '',
  ownerId: '',
};

export default function NewWatchScreen() {
  const router = useRouter();
  const [form, setForm] = useState<CreateWatchPayload>(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof CreateWatchPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  const goToDashboardWithRefresh = () => {
    router.replace(`/?refresh=${Date.now()}`);
  };

  const handleCreateWatch = async () => {
    const payload: CreateWatchPayload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      reference: form.reference.trim(),
      ownerId: form.ownerId.trim(),
    };

    if (Object.values(payload).some((value) => !value)) {
      setError('Tous les champs sont obligatoires.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/assets', payload);
      setSuccess(true);
      setForm(initialForm);
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
        <Text variant="headlineSmall" style={styles.successText}>
          Montre ajoutee
        </Text>
        <Text variant="bodyMedium" style={styles.successHint}>
          La montre est maintenant liee au compte proprietaire indique.
        </Text>
        <Button mode="contained" onPress={goToDashboardWithRefresh}>
          Retour a la liste
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
        <Text variant="headlineMedium" style={styles.title}>
          Ajouter une montre
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="bodyMedium" style={styles.hint}>
            Ce formulaire simule un membre certifie qui enregistre une nouvelle montre.
          </Text>

          <TextInput
            label="Nom de la montre"
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Marque"
            value={form.brand}
            onChangeText={(value) => updateField('brand', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Modele"
            value={form.model}
            onChangeText={(value) => updateField('model', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Reference"
            value={form.reference}
            onChangeText={(value) => updateField('reference', value)}
            mode="outlined"
            style={styles.input}
            autoCapitalize="characters"
          />

          <TextInput
            label="ID proprietaire"
            value={form.ownerId}
            onChangeText={(value) => updateField('ownerId', value)}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
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

