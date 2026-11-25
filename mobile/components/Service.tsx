import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api, { explain } from '../lib/api';
import { tr } from '../lib/i18n';
import { longDate, monthYear } from '../lib/format';
import { color, space } from '../theme/tokens';
import { Button, Icon, Notice, t } from './ui';

export type ServiceState = {
    status: 'REQUESTED' | 'IN_WORKSHOP' | 'RETURNED';
    requestedAt: string; receivedAt: string | null; returnedAt: string | null;
} | null;

// Durée d'atelier annoncée au client : une estimation d'affichage, pas un engagement de la maison.
// shortcut: six semaines pour toutes les pièces ; à remplacer par la date que donne la maison.
const WORKSHOP_WEEKS = 6;

/**
 * Écran 5 : on s'occupe de vous. Une demande, puis trois étapes qui disent chacune ce qui se passe
 * et quand ; le retour s'inscrit dans l'histoire signée de la pièce (ADR-0018).
 */
export default function Service({ assetId, service, nextService, onChange }: {
    assetId: string; service: ServiceState; nextService: string | null; onChange: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const open = service && service.status !== 'RETURNED';

    const request = async () => {
        setBusy(true);
        setError(null);
        try {
            await api.post(`/assets/${assetId}/service-requests`, {});
            onChange();
        } catch (e) {
            setError(explain(e, tr.service.failed));
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <View style={{ gap: space.md }}>
                {service?.returnedAt ? <Text style={t.body}>{tr.service.returnedBody(longDate(service.returnedAt))}</Text> : null}
                {nextService ? <Text style={t.body}>{tr.piece.nextServiceBody(nextService)}</Text> : null}
                {error ? <Notice message={error} /> : null}
                <Button label={tr.service.request} variant="secondary" loading={busy} onPress={request} />
                <Text style={t.small}>{tr.service.consent}</Text>
            </View>
        );
    }

    const back = service.receivedAt
        ? monthYear(new Date(new Date(service.receivedAt).getTime() + WORKSHOP_WEEKS * 7 * 86_400_000).toISOString())
        : '';
    const steps = [
        { done: true, title: tr.service.requested, body: tr.service.requestedBody(longDate(service.requestedAt)) },
        {
            done: Boolean(service.receivedAt),
            title: tr.service.workshop,
            body: service.receivedAt ? tr.service.workshopBody(longDate(service.receivedAt), back) : tr.service.workshopNext,
        },
        { done: false, title: tr.service.returned, body: tr.service.returnedNext },
    ];
    return (
        <View style={{ gap: space.md }}>
            {steps.map((step, i) => (
                <View key={step.title} style={styles.step}>
                    <View style={[styles.dot, step.done ? styles.done : null]}>
                        {step.done ? <Icon name="check" size={14} tone={color.onDeep} weight={2.5} /> : <Text style={t.label}>{i + 1}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[t.body, step.done ? t.strong : { color: color.slate }]}>{step.title}</Text>
                        <Text style={t.small}>{step.body}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    step: { flexDirection: 'row', gap: space.md },
    dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: color.hairline, alignItems: 'center', justifyContent: 'center' },
    done: { backgroundColor: color.deep, borderColor: color.deep },
});
