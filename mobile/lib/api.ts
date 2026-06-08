import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ACCESS_TOKEN_KEY } from '../app/index';

const api = axios.create({
    baseURL: 'http://192.168.1.140:3001',
});

// Intercepteur de requête : lit le token dans SecureStore et l'ajoute au header Authorization.
// Pourquoi un intercepteur plutôt que le passer manuellement ?
// → Centralise la logique auth en un seul endroit. Chaque appel api.get/post/...
//   est automatiquement authentifié sans rien changer dans les écrans.
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;