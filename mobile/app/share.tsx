import { useEffect, useState } from 'react';
import { View } from 'react-native';
import axios from 'axios';
import { useLocalSearchParams } from 'expo-router';
import api, { explain, stateOf } from '../lib/api';
import { tr } from '../lib/i18n';
import Passport, { type Verification } from '../components/Passport';
import { State } from '../components/ui';
import { color } from '../theme/tokens';

/** Ce que voit celui qui a reçu un lien du propriétaire : ce qu'il a choisi de montrer, pas plus. */
export default function ShareScreen() {
    const { t: token } = useLocalSearchParams<{ t: string }>();
    const [result, setResult] = useState<Verification | { valid: false } | null>(null);
    const [failure, setFailure] = useState<unknown>(null);

    useEffect(() => {
        api.get(`/shares/${encodeURIComponent(token ?? '')}`).then((res) => setResult(res.data), setFailure);
    }, [token]);

    if (result?.valid) return <Passport result={result} />;

    const gone = axios.isAxiosError(failure) && failure.response?.status === 410;
    return (
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: color.paper }}>
            {result ? (
                <State kind="error" alarm title={tr.verify.notConfirmed} body={tr.verify.notConfirmedBody} />
            ) : failure ? (
                <State
                    kind={stateOf(failure) === 'offline' ? 'offline' : 'notFound'}
                    title={gone ? tr.share.gone : undefined}
                    body={gone ? tr.share.goneBody : explain(failure, tr.state.notFound.body)}
                />
            ) : (
                <State kind="loading" />
            )}
        </View>
    );
}
