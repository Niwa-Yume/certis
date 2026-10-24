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

    // Web en dev : l'API est sur la même machine que la page. Ouverte depuis un téléphone par l'IP
    // du réseau local, la page appelle cette IP, et le QR qu'elle affiche y renvoie aussi.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_BACKEND_PORT}`;
    }

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

/** Les photos des pièces sont servies par l'API (`/public/watches/…`) ou par l'émetteur (URL complète). */
export const absoluteUrl = (path: string) => (path.startsWith('/') ? `${api.defaults.baseURL}${path}` : path);

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