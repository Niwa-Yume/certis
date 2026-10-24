import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import { useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import api from '../lib/api';
import { clock, longDate, registryNumber, shortDate, splitName } from '../lib/format';
import Report, { type Verification } from '../components/Report';
import { Button, Glow, PieceName, Spinner, Wordmark, t, useLayout } from '../components/ui';
import { color, space } from '../theme/tokens';

// Issues distinctes : une erreur technique ne doit jamais se lire « non authentique » (AUDIT N2),
// et un certificat authentique d'une pièce volée ne doit jamais se lire « vous pouvez acheter ».
type Outcome =
    | { state: 'loading' }
    | { state: 'authentic'; result: Verification }
    | { state: 'stolen'; result: Verification }
    | { state: 'not-authentic'; verifiedAt: string }
    | { state: 'unverifiable'; reason: string; retry: boolean };

function unverifiable(error: unknown): Outcome {
    if (axios.isAxiosError(error)) {
        if (!error.response) return { state: 'unverifiable', reason: 'Le registre est injoignable. Vérifiez votre connexion, puis réessayez.', retry: true };
        const { status } = error.response;
        if (status === 410) return { state: 'unverifiable', reason: 'Ce QR a expiré ou a déjà servi. Ce n’est pas un signe de contrefaçon : demandez-en un nouveau au propriétaire.', retry: false };
        if (status === 400 || status === 403 || status === 404) return { state: 'unverifiable', reason: 'Ce QR ne correspond pas à cette montre. Demandez au vendeur d’en générer un nouveau devant vous.', retry: false };
        if (status === 429) return { state: 'unverifiable', reason: 'Trop de vérifications en peu de temps. Patientez une minute, puis réessayez.', retry: true };
    }
    return { state: 'unverifiable', reason: 'Une erreur inattendue a interrompu la vérification.', retry: true };
}

export default function VerifyScreen() {
    const { id, nonce } = useLocalSearchParams<{ id: string; nonce: string }>();
    const [outcome, setOutcome] = useState<Outcome>({ state: 'loading' });
    const { compact } = useLayout();

    const run = useCallback(() => {
        if (!id || !nonce) return setOutcome({ state: 'unverifiable', reason: 'Ce QR est incomplet. Scannez-le à nouveau.', retry: false });
        setOutcome({ state: 'loading' });
        // Route publique : aucun compte n'est nécessaire pour vérifier.
        api.post(`/assets/${id}/authenticate`, { nonce })
            .then((res) => setOutcome(!res.data.valid
                ? { state: 'not-authentic', verifiedAt: res.data.verifiedAt }
                : res.data.status === 'STOLEN'
                    ? { state: 'stolen', result: res.data }
                    : { state: 'authentic', result: res.data }))
            .catch((error) => setOutcome(unverifiable(error)));
    }, [id, nonce]);

    useEffect(() => { run(); }, [run]);

    if (outcome.state === 'authentic') return <Report result={outcome.result} nonce={nonce} />;

    const dark = outcome.state === 'loading';
    const alarm = outcome.state === 'not-authentic' || outcome.state === 'stolen';
    const verifiedAt = outcome.state === 'not-authentic' ? outcome.verifiedAt : outcome.state === 'stolen' ? outcome.result.verifiedAt : null;
    const stolenSince = outcome.state === 'stolen'
        ? [...outcome.result.provenance].reverse().find((e) => e.type === 'STOLEN_REPORTED')?.at
        : undefined;
    const copy = {
        stolen: {
            a: 'Pièce',
            b: 'DÉCLARÉE VOLÉE',
            message: `Son propriétaire l’a déclarée volée${stolenSince ? ` le ${longDate(stolenSince)}` : ''}. Son certificat est authentique, mais n’achetez pas cette pièce.`,
        },
        loading: { a: 'Vérification', b: 'EN COURS', message: 'Quelques secondes. Ne fermez pas cette page.' },
        'not-authentic': { a: 'Authenticité', b: 'NON CONFIRMÉE', message: 'Les données de cette pièce ne correspondent pas à sa signature. Ne concluez pas la transaction pour l’instant.' },
        unverifiable: { a: 'Vérification', b: 'IMPOSSIBLE', message: outcome.state === 'unverifiable' ? outcome.reason : '' },
    }[outcome.state];

    return (
        <ScrollView style={{ backgroundColor: dark ? color.seal : color.paper }} contentContainerStyle={{ flexGrow: 1 }}>
            {dark ? <Glow cy="25%" rx="70%" ry="40%" strength={0.26} /> : null}
            {/* Mobile : la marche à suivre tombe sous le pouce ; desktop : un bloc centré. */}
            <View style={[styles.column, compact ? null : styles.centered]}>
                <View style={styles.header}>
                    <Wordmark tone={dark ? color.paper : color.ink} />
                    {verifiedAt ? (
                        <Text style={t.mono}>{shortDate(verifiedAt)} · {clock(verifiedAt).replace(' h ', ':')}</Text>
                    ) : null}
                </View>

                <View style={styles.icon}>
                    {outcome.state === 'loading' ? <Spinner size={150} /> : null}
                    {alarm ? (
                        <Svg width={150} height={150} viewBox="0 0 120 120" aria-hidden>
                            <Circle cx={60} cy={60} r={54} fill={color.white} stroke={color.refused} strokeWidth={2} />
                            <Path d="M60 36v30M60 80v2" fill="none" stroke={color.refused} strokeWidth={6} strokeLinecap="round" />
                        </Svg>
                    ) : null}
                    {outcome.state === 'unverifiable' ? (
                        <Svg width={150} height={150} viewBox="0 0 120 120" aria-hidden>
                            <Circle cx={60} cy={60} r={54} fill={color.white} stroke={color.slate} strokeWidth={2} />
                            <Path
                                d="M44 36h32M44 84h32M47 36c0 14 26 14 26 24s-26 10-26 24M73 36c0 14-26 14-26 24s26 10 26 24"
                                fill="none" stroke={color.slate} strokeWidth={3} strokeLinejoin="round"
                            />
                        </Svg>
                    ) : null}
                </View>

                <View accessibilityLiveRegion="polite" style={{ gap: 6, paddingHorizontal: 22 }}>
                    <Text style={[t.serif, t.italic, { fontSize: 30, lineHeight: 32, color: dark ? color.paper : color.ink }]}>{copy.a}</Text>
                    <Text style={[t.wide, { fontSize: 34, lineHeight: 38, color: alarm ? color.refused : dark ? color.gold : color.ink }]}>
                        {copy.b}
                    </Text>
                    <Text style={[t.body, { marginTop: 6, color: dark ? color.mist : color.ink }]}>{copy.message}</Text>
                </View>

                {outcome.state === 'loading' ? (
                    <Text style={[t.small, styles.footnote, compact ? null : styles.inline, { color: color.mist }]}>Aucun compte n’est nécessaire.</Text>
                ) : null}

                {outcome.state === 'not-authentic' ? (
                    <View style={[styles.card, compact ? null : styles.inline]}>
                        <Text style={[t.body, t.strong]}>Que faire maintenant ?</Text>
                        {[
                            'Demandez au vendeur un nouveau QR et vérifiez à nouveau.',
                            'Faites examiner la pièce par un revendeur agréé de la marque.',
                            'Gardez une capture de cet écran : il indique la date et l’heure de la vérification.',
                        ].map((step, i) => (
                            <View key={step} style={{ flexDirection: 'row', gap: 10 }}>
                                <Text style={[t.body, t.medium, { color: color.seal }]}>{i + 1}.</Text>
                                <Text style={[t.body, { flex: 1 }]}>{step}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {outcome.state === 'stolen' ? (
                    <View style={[styles.card, compact ? null : styles.inline]}>
                        <StolenCard result={outcome.result} />
                    </View>
                ) : null}

                {outcome.state === 'unverifiable' ? (
                    <View style={[styles.card, compact ? null : styles.inline]}>
                        <Text style={t.body}>
                            Chaque QR ne sert qu’une fois et expire après 60 secondes : une capture d’écran ne peut pas être réutilisée par un tiers.
                            Pour vérifier, le vendeur affiche un nouveau QR et vous le scannez avec l’appareil photo de votre téléphone.
                        </Text>
                        {outcome.retry ? <Button label="Réessayer" arrow onPress={run} /> : null}
                    </View>
                ) : null}
            </View>
        </ScrollView>
    );
}

/** La pièce désignée, pour que l'acheteur sache laquelle ne pas acheter, et la marche à suivre. */
function StolenCard({ result }: { result: Verification }) {
    const { issuer, credentialSubject: piece } = result.passport;
    return (
        <>
            <View style={{ gap: 3, paddingBottom: 10, borderBottomWidth: 1, borderColor: color.hairline }}>
                <Text style={[t.caps, { fontSize: 12 }]}>{piece.brand.toUpperCase()} · {piece.reference}</Text>
                <PieceName parts={splitName(piece.name)} size={26} />
                <Text style={t.mono}>N° {registryNumber(piece.id)}</Text>
            </View>
            <Text style={[t.body, t.strong]}>Que faire maintenant ?</Text>
            {[
                'Ne concluez pas la transaction.',
                'Signalez la pièce aux autorités, avec sa référence et son numéro d’inscription.',
                `Prévenez son émetteur : ${issuer.name}.`,
            ].map((step, i) => (
                <View key={step} style={{ flexDirection: 'row', gap: 10 }}>
                    <Text style={[t.body, t.medium, { color: color.seal }]}>{i + 1}.</Text>
                    <Text style={[t.body, { flex: 1 }]}>{step}</Text>
                </View>
            ))}
        </>
    );
}

const styles = StyleSheet.create({
    column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 24 },
    icon: { alignItems: 'center', paddingTop: 48, paddingBottom: 18 },
    centered: { justifyContent: 'center', paddingVertical: 48, gap: space.lg },
    inline: { marginTop: 0 },
    footnote: { marginTop: 'auto', marginHorizontal: 22, marginBottom: 28 },
    card: {
        marginTop: 'auto', margin: 14, padding: 16, gap: 10,
        backgroundColor: color.white, borderWidth: 1, borderColor: color.hairline,
    },
});
