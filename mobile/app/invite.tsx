import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import api, { explain, stateOf } from '../lib/api';
import { ACCESS_TOKEN_KEY } from '../lib/auth';
import { tr } from '../lib/i18n';
import { splitName } from '../lib/format';
import { setItemAsync } from '../lib/storage';
import FaceLine, { type Face } from '../components/Face';
import Showcase from '../components/Showcase';
import { Button, Notice, PieceName, State, TextField, TextLink, t, useLayout } from '../components/ui';
import { color, space, typeScale } from '../theme/tokens';

type Invitation = {
    email: string; house: string; issuedBy: Face | null; expiresAt: string;
    piece: { name: string; brand: string; model: string; reference: string; imageUrl: string | null; imageCutout: boolean };
};

/**
 * Écran 1 : la maison a invité son client. Rien à saisir qu'un mot de passe, un seul bouton ;
 * la pièce attend déjà dans la collection. Le jeton, montré en boutique, est la seule clé.
 */
export default function InviteScreen() {
    const { token } = useLocalSearchParams<{ token: string }>();
    const router = useRouter();
    const { wide } = useLayout();
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [failure, setFailure] = useState<unknown>(null);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<{ message: string; exists: boolean } | null>(null);

    useEffect(() => {
        api.get(`/invitations/${encodeURIComponent(token ?? '')}`).then((res) => setInvitation(res.data), setFailure);
    }, [token]);

    const create = async () => {
        setBusy(true);
        setError(null);
        try {
            const { data } = await api.post(`/invitations/${encodeURIComponent(token ?? '')}/accept`, { password });
            await setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
            router.replace('/dashboard');
        } catch (e) {
            const exists = axios.isAxiosError(e) && e.response?.status === 409;
            setError({ message: explain(e, tr.invite.failed), exists });
        } finally {
            setBusy(false);
        }
    };

    if (!invitation) {
        return (
            <View style={styles.center}>
                {failure ? (
                    // 410 : expirée. Le serveur dit quoi faire ; on garde son message.
                    <State kind={stateOf(failure) === 'offline' ? 'offline' : 'notFound'} body={explain(failure, tr.state.notFound.body)} />
                ) : (
                    <State kind="loading" />
                )}
            </View>
        );
    }

    const { piece } = invitation;
    const title = wide ? typeScale.display : typeScale.title;
    return (
        <Showcase imageUrl={piece.imageUrl} cutout={piece.imageCutout} label={`${piece.brand} ${piece.name}`}>
            <View style={{ gap: space.sm }}>
                <Text style={t.caps}>{invitation.house}</Text>
                <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[t.serif, { fontSize: title, lineHeight: title * 1.05 }]}>
                    {tr.invite.title}
                </Text>
            </View>
            <PieceName parts={splitName(piece.name, piece.model)} size={typeScale.title} />
            {invitation.issuedBy ? <FaceLine face={invitation.issuedBy} house={invitation.house} /> : null}
            <Text style={t.body}>{tr.invite.body(invitation.issuedBy?.name ?? invitation.house, piece.name)}</Text>

            <View style={styles.form}>
                <View style={{ gap: space.xs }}>
                    <Text style={t.label}>{tr.invite.email}</Text>
                    <Text style={[t.body, t.medium]}>{invitation.email}</Text>
                </View>
                <TextField
                    label={tr.invite.password}
                    hint={tr.invite.passwordHint}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    onSubmitEditing={create}
                />
                {error ? <Notice message={error.message} /> : null}
                {error?.exists ? (
                    <TextLink label={tr.invite.signIn} onPress={() => router.push({ pathname: '/login', params: { next: '/dashboard' } })} />
                ) : (
                    <Button label={tr.invite.create} arrow loading={busy} disabled={password.length < 8} onPress={create} />
                )}
            </View>
        </Showcase>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
    form: { gap: space.md, paddingTop: space.lg, borderTopWidth: 1, borderColor: color.hairline },
});
