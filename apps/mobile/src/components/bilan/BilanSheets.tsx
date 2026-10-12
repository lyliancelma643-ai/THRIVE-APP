import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { GlassButton, ListGroup, ListRow, Sheet, SPACING, ThemedText, useTheme } from '../../design';
import {
  ACCENT_KEYS, ACCENT_LABEL, ACCENT_TOKEN, LSSS_MOMENT_LABEL, LSSS_MOMENT_ORDER, parseJersey, skillLabel,
  type AccentKey, type Gauge, type Identity, type LsssPoint,
} from './bilanData';
import { CurveCaption, ValueCurve } from './PermaCurve';

// H — Compétences de vie : Sheet grand détent, courbe LSSS Départ → Final + une rangée par compétence.
export function LifeSkillsSheet({ visible, onClose, lsss, gauge }: { visible: boolean; onClose: () => void; lsss: LsssPoint[]; gauge: Gauge | null }) {
  const { colors } = useTheme();
  const ordered = LSSS_MOMENT_ORDER.map((m) => lsss.find((p) => p.moment === m)).filter(Boolean) as LsssPoint[];
  const skills = Object.entries(gauge?.by_skill ?? {});
  return (
    <Sheet visible={visible} onClose={onClose} title="Compétences de vie" detent="large">
      {ordered.length > 0 ? (
        <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: 16, padding: SPACING.space4, marginBottom: SPACING.space3 }}>
          <ValueCurve
            values={ordered.map((p) => p.value)}
            labels={ordered.map((p) => LSSS_MOMENT_LABEL[p.moment])}
            accessibilityLabel={`Courbe des compétences de vie : ${ordered.map((p) => `${LSSS_MOMENT_LABEL[p.moment]} ${p.value}`).join(', ')}`}
          />
          <CurveCaption>Un point par questionnaire rempli ensemble.</CurveCaption>
        </View>
      ) : (
        <ThemedText variant="subheadline" color="label2" style={{ marginBottom: SPACING.space3 }}>
          La courbe apparaîtra après le premier questionnaire.
        </ThemedText>
      )}
      {skills.length > 0 ? (
        <ListGroup>
          {skills.map(([k, v], i) => (
            <ListRow key={k} title={skillLabel(k)} value={String(Math.round(Number(v)))} last={i === skills.length - 1} />
          ))}
        </ListGroup>
      ) : null}
    </Sheet>
  );
}

// I — Comprendre l'outil : Sheet flottante (medium), texte neutre.
export function UnderstandSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const block = (t: string, b: string) => (
    <View style={{ marginBottom: SPACING.space3 }}>
      <ThemedText variant="headline">{t}</ThemedText>
      <ThemedText variant="subheadline" color="label2" style={{ marginTop: 2 }}>{b}</ThemedText>
    </View>
  );
  return (
    <Sheet visible={visible} onClose={onClose} title="Comprendre l’outil" detent="medium">
      {block('Ce que ça montre', 'Le questionnaire rempli avec votre enfant au départ, à mi-parcours et à la fin donne un repère sur ses compétences de vie.')}
      {block('Pourquoi', 'Pour voir ce qui progresse au fil du programme et en parler ensemble, à la maison comme avec le coach.')}
      {block('Comment le lire', 'La courbe compare des moments entre eux. Ce n’est pas une note : c’est un repère pour la conversation.')}
    </Sheet>
  );
}

// J — Personnaliser le passeport : surnom, numéro, couleur. (Photo : [À COMPLÉTER], upload bucket child-avatars non repris ici.)
export function PersonalizeSheet({
  visible, onClose, value, onSave, saving,
}: { visible: boolean; onClose: () => void; value: Identity; onSave: (v: Identity) => void; saving?: boolean }) {
  const { colors } = useTheme();
  const [nick, setNick] = useState(value.nickname ?? '');
  const [num, setNum] = useState(value.jersey_number == null ? '' : String(value.jersey_number));
  const [accent, setAccent] = useState<AccentKey | null>(value.accent_color);
  useEffect(() => {
    if (visible) {
      setNick(value.nickname ?? '');
      setNum(value.jersey_number == null ? '' : String(value.jersey_number));
      setAccent(value.accent_color);
    }
  }, [visible, value]);
  const jersey = parseJersey(num);
  const numOk = num.trim() === '' || jersey !== null;
  const inputStyle = {
    minHeight: SPACING.touchMin, borderRadius: 12, paddingHorizontal: SPACING.space3,
    backgroundColor: colors.bgGrouped2, color: colors.label, fontSize: 17,
  } as const;
  return (
    <Sheet visible={visible} onClose={onClose} title="Personnaliser le passeport" detent="large">
      <ThemedText variant="footnote" color="label2" style={{ marginBottom: 6 }}>Surnom</ThemedText>
      <TextInput
        value={nick}
        onChangeText={(t) => setNick(t.slice(0, 30))}
        placeholder="Facultatif"
        placeholderTextColor={colors.label2}
        accessibilityLabel="Surnom"
        style={inputStyle}
      />
      <ThemedText variant="footnote" color="label2" style={{ marginTop: SPACING.space3, marginBottom: 6 }}>Numéro de maillot (0 à 999)</ThemedText>
      <TextInput
        value={num}
        onChangeText={(t) => setNum(t.replace(/\D/g, '').slice(0, 3))}
        keyboardType="number-pad"
        placeholder="Facultatif"
        placeholderTextColor={colors.label2}
        accessibilityLabel="Numéro de maillot"
        style={inputStyle}
      />
      <ThemedText variant="footnote" color="label2" style={{ marginTop: SPACING.space3, marginBottom: 6 }}>Couleur</ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {ACCENT_KEYS.map((k) => {
          const on = accent === k;
          return (
            <Pressable
              key={k}
              onPress={() => setAccent(on ? null : k)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Couleur ${ACCENT_LABEL[k]}`}
              style={{ width: SPACING.touchMin, height: SPACING.touchMin, marginRight: SPACING.space2, marginBottom: SPACING.space2, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors[ACCENT_TOKEN[k]], borderWidth: on ? 3 : 0, borderColor: colors.label }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginTop: SPACING.space4, marginBottom: SPACING.space2, alignItems: 'flex-start' }}>
        <GlassButton
          label={saving ? 'Enregistrement…' : 'Enregistrer'}
          tinted
          accessibilityLabel="Enregistrer le passeport"
          onPress={() => {
            if (!numOk || saving) return;
            onSave({ nickname: nick.trim() || null, jersey_number: jersey, accent_color: accent });
          }}
        />
      </View>
    </Sheet>
  );
}
