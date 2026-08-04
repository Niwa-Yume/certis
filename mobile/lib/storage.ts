import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function canUseWebStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        if (!canUseWebStorage()) return null;

        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        if (!canUseWebStorage()) return;

        try {
            window.localStorage.setItem(key, value);
        } catch {
            // Ignore storage write errors (private mode, disabled storage, quota, etc.).
        }
        return;
    }

    await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        if (!canUseWebStorage()) return;

        try {
            window.localStorage.removeItem(key);
        } catch {
            // Ignore storage delete errors for the same reason as writes.
        }
        return;
    }

    await SecureStore.deleteItemAsync(key);
}

