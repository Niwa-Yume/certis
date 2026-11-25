import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api, { stateOf } from '../lib/api';
import { tr } from '../lib/i18n';
import { longDate, splitName } from '../lib/format';
import Showcase from '../components/Showcase';
import { Icon, PieceName, State, t, useLayout } from '../components/ui';
import { color, space, typeScale } from '../theme/tokens';

type Card = {
    state: 'pending' | 'verified' | 'unconfirmed' | 'stolen'; house: string; stolenAt?: string;
    piece: { name: string; brand: string; model: string; reference: string; imageUrl: string | null; imageCutout: boolean };
};

/**
 * La carte remise avec la pièce. Son QR est permanent et public : il ne dit que l'état du
 * passeport (principe « discret par défaut »). L'histoire, le propriétaire la partage s'il le veut.
 */
export default function CardScreen() {
    const { c } = useLocalSearchParams<{ c: string }>();
    const { wide } = useLayout();
    const [card, setCard] = useState<Card | null>(null);
    const [failure, setFailure] = useState<unknown>(null);

    useEffect(() => {
        api.get(`/cards/${encodeURIComponent(c ?? '')}`).then((res) => setCard(res.data), setFailure);
    }, [c]);

    if (!card) {
        return (
            <View style={styles.center}>
                {failure ? <State kind={stateOf(failure)} /> : <State kind="loading" />}
            </View>
        );
    }

    const { piece, state } = card;
    const alarm = state === 'stolen' || state === 'unconfirmed';
    const title = wide ? typeScale.display : typeScale.title;
    const verdict = {
        verified: { icon: 'check', tone: color.verified, title: tr.card.verified, body: tr.card.issuedBy(card.house) },
        pending: { icon: 'loupe', tone: color.slate, title: tr.card.pending, body: tr.card.pendingBody },
        stolen: { icon: 'alert', tone: color.refused, title: tr.card.stolen(card.stolenAt ? longDate(card.stolenAt) : ''), body: tr.card.stolenBody },
        unconfirmed: { icon: 'alert', tone: color.refused, title: tr.card.unconfirmed, body: tr.card.unconfirmedBody },
    }[state];

    return (
        <Showcase imageUrl={piece.imageUrl} cutout={piece.imageCutout} label={`${piece.brand} ${piece.name}`}>
            <View accessibilityRole={alarm ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ gap: space.sm }}>
                <View style={styles.verdict}>
                    <Icon name={verdict.icon as 'check'} size={28} tone={verdict.tone} weight={2.5} />
                    <Text
                        accessibilityRole="header"
                        maxFontSizeMultiplier={1.3}
                        style={[t.serif, { fontSize: title, lineHeight: title * 1.05, flexShrink: 1 }, alarm ? { color: color.refused } : null]}
                    >
                        {verdict.title}
                    </Text>
                </View>
                <Text style={[t.body, t.strong]}>{verdict.body}</Text>
            </View>
            <View style={{ gap: space.xs }}>
                <Text style={t.caps}>{piece.brand} · {piece.reference}</Text>
                <PieceName parts={splitName(piece.name, piece.model)} size={typeScale.title} />
            </View>
            {state === 'verified' ? <Text style={[t.body, { color: color.slate }]}>{tr.card.more}</Text> : null}
        </Showcase>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
    verdict: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
