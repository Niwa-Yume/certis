import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ACCESS_TOKEN_KEY } from './auth';
import { deleteItemAsync, getItemAsync } from './storage';

const DEFAULT_BACKEND_PORT = 3001;

function getHostFromExpoConfig(): string | null {
    const hostUri = Constants.expoConfig?.hostUri;
    if (!hostUri) return null;

    try {
        const url = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
        return url.hostname;
    } catch {
        return null;
    }
}

function getApiBaseUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (envUrl) return envUrl;

    const host = getHostFromExpoConfig();
    if (!host) {
        return `http://localhost:${DEFAULT_BACKEND_PORT}`;
    }

    if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
        return `http://10.0.2.2:${DEFAULT_BACKEND_PORT}`;
    }

    return `http://${host}:${DEFAULT_BACKEND_PORT}`;
}

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 15000,
});

// Intercepteur de requête : lit le token via le wrapper storage et l'ajoute au header Authorization.
// Pourquoi un intercepteur plutôt que le passer manuellement ?
// → Centralise la logique auth en un seul endroit. Chaque appel api.get/post/...
//   est automatiquement authentifié sans rien changer dans les écrans.
api.interceptors.request.use(async (config) => {
    const token = await getItemAsync(ACCESS_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers) {
        delete config.headers.Authorization;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error?.response?.status === 401) {
            await deleteItemAsync(ACCESS_TOKEN_KEY);
        }

        return Promise.reject(error);
    },
);

export default api;