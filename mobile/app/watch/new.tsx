import { useState } from 'react';
import { View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';
import BrandLogo from '../../components/BrandLogo';
import { styles } from './new.styles';
import { palette, spacing } from '../../theme/tokens';

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
  const [imageUri, setImageUri] = useState<string | null>(null);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission galerie refusée.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission caméra refusée.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
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
      // On envoie multipart/form-data pour supporter l'upload d'image
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('brand', brand.trim());
      formData.append('model', model.trim());
      formData.append('reference', reference.trim());

      if (imageUri) {
        const filename = imageUri.split('/').pop() ?? 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        // @ts-ignore — React Native accepte cet objet dans FormData
        formData.append('image', { uri: imageUri, name: filename, type: mime });
      }

      await api.post('/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setForm(initialForm);
      setImageUri(null);
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

          {/* Section photo */}
          <Text variant="titleSmall" style={{ marginBottom: spacing.sm, marginTop: spacing.sm }}>
            Photo de la montre (optionnel)
          </Text>
          {imageUri ? (
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: spacing.sm }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View style={{ backgroundColor: palette.surface, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm }}>
              <Text variant="bodyMedium" style={{ color: palette.neutralText, marginBottom: spacing.sm }}>
                Aucune photo sélectionnée
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <Button mode="outlined" icon="camera" onPress={takePhoto} style={{ flex: 1 }}>
              Appareil photo
            </Button>
            <Button mode="outlined" icon="image" onPress={pickImage} style={{ flex: 1 }}>
              Galerie
            </Button>
          </View>

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
