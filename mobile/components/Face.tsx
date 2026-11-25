import { Image, StyleSheet, Text, View } from 'react-native';
import { tr } from '../lib/i18n';
import { color, space } from '../theme/tokens';
import { t } from './ui';

export type Face = { name: string; title: string | null; photoUrl: string | null };

/** Un visage, pas un système : la personne de la maison qui a émis le passeport. */
export default function FaceLine({ face, house }: { face: Face; house: string }) {
    const initials = face.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return (
        <View style={styles.face}>
            {face.photoUrl ? (
                <Image source={{ uri: face.photoUrl }} accessibilityIgnoresInvertColors style={styles.avatar} />
            ) : (
                <View aria-hidden style={[styles.avatar, styles.initials]}>
                    <Text style={[t.body, t.medium, { color: color.onDeep }]}>{initials}</Text>
                </View>
            )}
            <View style={{ flex: 1 }}>
                <Text style={t.label}>{tr.piece.issuedBy}</Text>
                <Text style={[t.body, t.strong]}>{face.name}</Text>
                <Text style={t.small}>{face.title ? `${face.title}, ${house}` : house}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    face: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    initials: { backgroundColor: color.deep, alignItems: 'center', justifyContent: 'center' },
});
