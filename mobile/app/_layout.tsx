import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
// Une graisse par import : l'index des paquets embarquerait toutes les graisses (46 fichiers au lieu de 8).
import { Unbounded_300Light } from '@expo-google-fonts/unbounded/300Light';
import { Unbounded_500Medium } from '@expo-google-fonts/unbounded/500Medium';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { color } from '../theme/tokens';

// Web : anneau de focus double (or puis bleu sceau), visible sur le papier comme sur le bleu nuit.
// Impression du rapport : couleurs conservées, page entière plutôt que l'écran visible, sans les
// commandes ni les effets de défilement. Injecté ici car `web.output: single` n'utilise pas +html.tsx.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = 'fr';
    const style = document.createElement('style');
    style.textContent = `
        body { background-color: ${color.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        :focus { outline: none; }
        :focus-visible { outline: 2px solid ${color.gold}; outline-offset: 2px; box-shadow: 0 0 0 5px ${color.seal}; }
        @media print {
            html, body, #root { height: auto !important; }
            #root * { overflow: visible !important; }
            #report { flex: none !important; height: auto !important; }
            #report * { opacity: 1 !important; }
            #scan, #stack, #inspect, #print-hero, #print-proof { display: none !important; }
        }
    `;
    document.head.appendChild(style);
}

export default function RootLayout() {
    const [loaded, error] = useFonts({
        Unbounded_300Light,
        Unbounded_500Medium,
        InstrumentSerif_400Regular,
        InstrumentSerif_400Regular_Italic,
        Geist_400Regular,
        Geist_500Medium,
        Geist_600SemiBold,
        GeistMono_400Regular,
    });
    // Sans les polices, la mise en page saute à leur arrivée : on attend (quelques ms en local).
    // En cas d'échec, on affiche avec les polices système plutôt que rien.
    if (!loaded && !error) return null;

    return <Stack screenOptions={{ headerShown: false, title: 'Certis', contentStyle: { backgroundColor: color.paper } }} />;
}
