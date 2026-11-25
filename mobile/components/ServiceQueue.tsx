import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api, { explain } from '../lib/api';
import { tr } from '../lib/i18n';
import { longDate } from '../lib/format';
import { color, space } from '../theme/tokens';
import { Button, Notice, TextField, t } from './ui';

type Request = {
    id: string; status: 'REQUESTED' | 'IN_WORKSHOP'; requestedAt: string; receivedAt: string | null; owner: string;
    piece: { id: string; name: string; reference: string };
};

/** Côté maison : la file des révisions, un outil métier. Recevoir en atelier, puis rendre avec une note. */
export default function ServiceQueue() {
    const [requests, setRequests] = useState<Request[] | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        api.get('/service-requests').then((res) => setRequests(res.data), () => setRequests([]));
    }, []);
    useEffect(load, [load]);

    const act = async (r: Request) => {
        setBusy(r.id);
        setError(null);
        try {
            if (r.status === 'REQUESTED') await api.post(`/service-requests/${r.id}/receive`);
            else await api.post(`/service-requests/${r.id}/return`, { note: notes[r.id] ?? '' });
            load();
        } catch (e) {
            setError(explain(e, tr.service.failed));
        } finally {
            setBusy(null);
        }
    };

    if (!requests) return null;
    return (
        <View style={styles.section}>
            <Text accessibilityRole="header" style={t.caps}>{tr.service.queue}</Text>
            {requests.length === 0 ? <Text style={[t.body, { color: color.slate }]}>{tr.service.empty}</Text> : null}
            {error ? <Notice message={error} /> : null}
            {requests.map((r) => (
                <View key={r.id} style={styles.row}>
                    <View style={{ flex: 1, minWidth: 220, gap: space.xs }}>
                        <Text style={[t.body, t.strong]}>{r.piece.name}</Text>
                        <Text style={t.small}>{r.piece.reference} · {tr.service.client(r.owner)}</Text>
                        <Text style={t.small}>
                            {r.status === 'REQUESTED' ? tr.service.requestedBody(longDate(r.requestedAt)) : `${tr.service.workshop} · ${longDate(r.receivedAt!)}`}
                        </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 220, gap: space.sm }}>
                        {r.status === 'IN_WORKSHOP' ? (
                            <TextField
                                label={tr.service.note}
                                hint={tr.service.noteHint}
                                value={notes[r.id] ?? ''}
                                onChangeText={(v) => setNotes((n) => ({ ...n, [r.id]: v }))}
                            />
                        ) : null}
                        <Button
                            label={r.status === 'REQUESTED' ? tr.service.receive : tr.service.giveBack}
                            variant={r.status === 'REQUESTED' ? 'secondary' : 'primary'}
                            loading={busy === r.id}
                            disabled={r.status === 'IN_WORKSHOP' && !(notes[r.id] ?? '').trim()}
                            onPress={() => act(r)}
                        />
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { gap: space.md, paddingVertical: space.lg, marginBottom: space.lg, borderBottomWidth: 1, borderColor: color.hairline },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingVertical: space.md, borderTopWidth: 1, borderColor: color.hairline },
});
