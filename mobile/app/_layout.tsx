import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { appTheme } from '../theme/theme';

export default function RootLayout() {
    return (
        <PaperProvider theme={appTheme}>
            <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
    );
}