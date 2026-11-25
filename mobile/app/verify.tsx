import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import axios from 'axios';
import { useLocalSearchParams } from 'expo-router';
import api from '../lib/api';
import { tr } from '../lib/i18n';
import Passport, { type Verification } from '../components/Passport';
import { State, Wordmark } from '../components/ui';
import { color, space } from '../theme/tokens';

// Issues distinctes : une erreur technique ne doit jamais se lire « non confirmé » (AUDIT N2),
// et un passeport en règle d'une pièce volée ne doit jamais se lire « vous pouvez acheter ».
type Outcome =
    | { state: 'loading' }
    | { state: 'verified'; result: Verification }
    | { state: 'not-confirmed' }
    | { state: 'unverifiable'; reason: string; retry: boolean };

function unverifiable(error: unknown): Outcome {
    if (axios.isAxiosError(error)) {
        if (!error.response) return { state: 'unverifiable', reason: tr.unreachable, retry: true };
        const { status } = error.response;
        if (status === 410) return { state: 'unverifiable', reason: tr.verify.expired, retry: false };
        if (status === 400 || status === 403 || status === 404) return { state: 'unverifiable', reason: tr.verify.wrongQr, retry: false };
        if (status === 429) return { state: 'unverifiable', reason: tr.verify.tooMany, retry: true };
    }
    return { state: 'unverifiable', reason: tr.verify.unexpected, retry: true };
}

/** Écran 7 : ce que voit l'acheteur qui scanne le QR du propriétaire. Aucun compte n'est nécessaire. */
export default function VerifyScreen() {
    const { id, nonce } = useLocalSearchParams<{ id: string; nonce: string }>();
    const [outcome, setOutcome] = useState<Outcome>({ state: 'loading' });

    const run = useCallback(() => {
        if (!id || !nonce) return setOutcome({ state: 'unverifiable', reason: tr.verify.incomplete, retry: false });
        setOutcome({ state: 'loading' });
        api.post(`/assets/${id}/authenticate`, { nonce })
            .then((res) => setOutcome(res.data.valid ? { state: 'verified', result: res.data } : { state: 'not-confirmed' }))
            .catch((error) => setOutcome(unverifiable(error)));
    }, [id, nonce]);

    useEffect(() => { run(); }, [run]);

    if (outcome.state === 'verified') return <Passport result={outcome.result} nonce={nonce} />;

    return (
        <ScrollView style={{ backgroundColor: color.paper }} contentContainerStyle={{ flexGrow: 1, padding: space.lg }}>
            <Wordmark />
            <View style={{ flex: 1, justifyContent: 'center' }}>
                {outcome.state === 'loading' ? (
                    <State kind="loading" title={tr.verify.checking} body={tr.verify.checkingBody} />
                ) : outcome.state === 'not-confirmed' ? (
                    <State kind="error" alarm title={tr.verify.notConfirmed} body={tr.verify.notConfirmedBody} />
                ) : (
                    <State
                        kind="error"
                        title={tr.verify.unverifiable}
                        body={outcome.reason}
                        action={outcome.retry ? { label: tr.retry, onPress: run } : undefined}
                    />
                )}
            </View>
        </ScrollView>
    );
}
