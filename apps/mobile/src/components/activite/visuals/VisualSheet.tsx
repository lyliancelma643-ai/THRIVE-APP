import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button, Enamel, FadeBottom, Icon, Sheet, ThemedText, useTheme, withAlpha } from '../../../design';
import type { VisualId } from '../../../lib/p3';
import { Display } from '../parts';
import { frTypo } from '../flow';
import {
  CARTE, COLONNES, EMOTIONS, ENDROITS_ITEMS, ESCALIER_STEPS, SENS_ITEMS, THERMO, TOOLS, VISUAL_BACK, VISUAL_HINTS, VISUAL_LABELS,
  toggleSelection, toolAskLine, toolWordsLine, type VisualListItem,
} from './content';
import { CloudRain, EmotionFace, ListIcon, ToolIcon } from './glyphs';

// VI1–VI8 · Feuille plein écran d'un visuel : le parent tend le téléphone, l'enfant MONTRE DU DOIGT. Toucher une case la met
// en avant (une seule à la fois, re-toucher la retire) pour que les deux voient la même chose. Sous le mode activité, donc
// en Veillée : la marque de sélection est crème (jamais jaune) ; le seul émail de la feuille est l'objectif de l'escalier.

/** Case sélectionnable : bord crème 2 pt quand elle est en avant, filet discret sinon (même épaisseur : rien ne bouge). */
function Pick({
  selected, onPress, label, children, style,
}: { selected: boolean; onPress: () => void; label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, reduceMotion } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        {
          borderRadius: 22, borderWidth: 2, borderColor: selected ? colors.label : colors.separator,
          backgroundColor: selected ? colors.fill3 : colors.fill4,
          transform: selected && !reduceMotion ? [{ scale: 1.03 }] : undefined,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

function Emotions() {
  const { colors } = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  const picked = EMOTIONS.find((e) => e.id === sel);
  return (
    <View>
      {picked ? (
        <View
          style={{ alignItems: 'center', padding: 16, borderRadius: 26, backgroundColor: colors.bgGrouped2, borderWidth: 1, borderColor: colors.sage }}
          accessibilityLiveRegion="polite"
        >
          <EmotionFace id={picked.id} size={84} />
          <Display size={32} lineHeight={36} weight={600} style={{ marginTop: 8 }}>{picked.label}</Display>
        </View>
      ) : null}
      <View style={{ marginTop: picked ? 14 : 0, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {EMOTIONS.map((e) => (
          <Pick
            key={e.id}
            selected={sel === e.id}
            label={e.label}
            onPress={() => setSel((cur) => toggleSelection(cur, e.id))}
            style={{ width: '48.5%', minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <EmotionFace id={e.id} size={52} />
            <ThemedText variant="callout" weight={600}>{e.label}</ThemedText>
          </Pick>
        ))}
      </View>
    </View>
  );
}

function Thermometre() {
  const { colors } = useTheme();
  const [sel, setSel] = useState<number | null>(null);
  const levels = Array.from({ length: THERMO.max - THERMO.min + 1 }, (_, i) => THERMO.max - i);
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'stretch' }}>
      <View style={{ flex: 1, gap: 6 }}>
        {levels.map((n) => {
          const active = sel === n;
          const hue = 150 - (n - THERMO.min) * 15; // vert → rouge, calculé : aucune couleur en dur
          return (
            <Pressable
              key={n}
              onPress={() => setSel((cur) => toggleSelection(cur, n))}
              accessibilityRole="button"
              accessibilityLabel={`${n}${n === THERMO.min ? `, ${THERMO.calm}` : n === THERMO.max ? `, ${THERMO.over}` : ''}`}
              accessibilityState={{ selected: active }}
              style={{
                height: 44, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
                backgroundColor: `hsl(${hue}, 52%, ${active ? 52 : 44}%)`,
                borderWidth: 3, borderColor: active ? colors.cream : 'transparent',
              }}
            >
              <ThemedText variant="headline" weight={700} style={{ color: colors.cream, fontVariant: ['tabular-nums'] }}>{String(n)}</ThemedText>
              <ThemedText variant="foot" weight={600} style={{ color: colors.cream }}>
                {n === THERMO.min ? THERMO.calm : n === THERMO.max ? THERMO.over : ''}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <View style={{ width: 84, alignItems: 'center', justifyContent: 'center' }} accessibilityLiveRegion="polite">
        {sel !== null ? <Display size={72} lineHeight={76} weight={600} align="center">{String(sel)}</Display> : null}
      </View>
    </View>
  );
}

function Colonnes() {
  const { colors } = useTheme();
  const col = (on: boolean, title: string, icon: ReactNode, items: readonly string[]) => (
    <View
      style={{
        flex: 1, padding: 16, borderRadius: 22, borderWidth: on ? 2 : 1.5, borderColor: on ? colors.sage : colors.separator,
        backgroundColor: on ? withAlpha(colors.sage, 0.08) : undefined,
      }}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View>
      <ThemedText variant="headline" weight={600} style={{ marginTop: 10 }}>{title}</ThemedText>
      <View style={{ marginTop: 12, gap: 7 }}>
        {items.map((t) => <ThemedText key={t} variant="callout" color="label2">{t}</ThemedText>)}
      </View>
    </View>
  );
  return (
    <View>
      <ThemedText variant="sub" weight={500} color="label2" style={{ marginBottom: 12 }}>{COLONNES.example}</ThemedText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {col(true, COLONNES.mine.title, <Icon name="hand" size={32} color={colors.sage} />, COLONNES.mine.items)}
        {col(false, COLONNES.notMine.title, <CloudRain />, COLONNES.notMine.items)}
      </View>
    </View>
  );
}

function Escalier() {
  const { colors } = useTheme();
  const last = ESCALIER_STEPS.length - 1;
  // L'objectif tout en haut, la marche la plus facile en bas.
  const rows = ESCALIER_STEPS.map((label, i) => ({ label, i })).reverse();
  return (
    <View style={{ marginTop: 8, gap: 10 }}>
      {rows.map(({ label, i }) => {
        const goal = i === last;
        const inner = (
          <View style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
            <ThemedText variant="callout" weight={600} style={{ opacity: 0.6, fontVariant: ['tabular-nums'] }}>{String(i + 1)}</ThemedText>
            {goal ? <Icon name="target" size={18} /> : null}
            <ThemedText variant="callout" weight={600} style={{ flex: 1 }}>{label}</ThemedText>
          </View>
        );
        return (
          <View key={label} style={{ paddingLeft: `${i * 17}%` }} accessible accessibilityLabel={`${i + 1}, ${label}`}>
            {goal ? (
              <Enamel radius={16}>{inner}</Enamel>
            ) : (
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.fill4 }}>{inner}</View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Carte() {
  const { colors } = useTheme();
  // Quatre places autour : haut, droite, bas, gauche.
  const spots: ViewStyle[] = [
    { top: 0, left: '34.25%' },
    { top: '34.25%', right: 0 },
    { bottom: 0, left: '34.25%' },
    { top: '34.25%', left: 0 },
  ];
  return (
    <View style={{ width: '100%', maxWidth: 330, aspectRatio: 1, alignSelf: 'center', marginTop: 10 }}>
      <View style={{ position: 'absolute', width: '100%', height: '100%' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width="100%" height="100%" viewBox="0 0 330 330">
          <Path d="M165 112V60M218 165h52M165 218v52M112 165H60" stroke={withAlpha(colors.sage, 0.5)} strokeWidth={2} strokeDasharray="3 5" />
        </Svg>
      </View>
      <View
        style={{
          position: 'absolute', top: '34%', left: '34%', right: '34%', bottom: '34%', borderRadius: 999, alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.bgGrouped2, borderWidth: 2, borderColor: colors.sage,
        }}
      >
        <Display size={26} lineHeight={30} weight={600}>{CARTE.center}</Display>
      </View>
      {CARTE.around.map((a, i) => (
        <View
          key={i}
          style={[
            {
              position: 'absolute', width: '31.5%', aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', padding: 10,
              backgroundColor: colors.fill4, borderWidth: 2, borderColor: withAlpha(colors.label, 0.3),
            },
            spots[i],
          ]}
        >
          <ThemedText variant="foot" color="label2" style={{ textAlign: 'center' }}>{a}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function ListVisual({ items }: { items: VisualListItem[] }) {
  const { colors } = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  return (
    <View style={{ gap: 12 }}>
      {items.map((it) => (
        <Pick
          key={it.id}
          selected={sel === it.id}
          label={`${it.title} ${it.sub}`}
          onPress={() => setSel((cur) => toggleSelection(cur, it.id))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 84, paddingVertical: 14, paddingHorizontal: 16 }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill3 }}>
            <ListIcon id={it.id} color={colors.sage} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Display size={23} lineHeight={28} weight={600}>{it.title}</Display>
            <ThemedText variant="callout" color="label2" style={{ marginTop: 2 }}>{it.sub}</ThemedText>
          </View>
        </Pick>
      ))}
    </View>
  );
}

function Outils({ notes }: { notes: Record<string, string> }) {
  const { colors } = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  return (
    <View style={{ gap: 9 }}>
      {TOOLS.map((t) => {
        const open = sel === t.id;
        const words = toolWordsLine(t, notes);
        return (
          <Pressable
            key={t.id}
            onPress={() => setSel((cur) => toggleSelection(cur, t.id))}
            accessibilityRole="button"
            accessibilityLabel={`${t.name}. ${t.what}`}
            accessibilityState={{ expanded: open }}
            style={{
              padding: 14, borderRadius: 20, borderWidth: 2, borderColor: open ? colors.label : colors.separator,
              backgroundColor: open ? colors.fill3 : undefined,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill3 }}>
                <ToolIcon id={t.id} color={colors.sage} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText variant="callout" weight={600}>{t.name}</ThemedText>
                <ThemedText variant="foot" color="label2" style={{ fontSize: 13.5 }}>{t.what}</ThemedText>
              </View>
            </View>
            {words ? <ThemedText variant="foot" color="sageText" style={{ marginTop: 8, fontSize: 13.5 }}>{frTypo(words)}</ThemedText> : null}
            {open ? (
              <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: colors.fill3 }}>
                <ThemedText variant="callout" style={{ fontSize: 15.5, lineHeight: 21 }}>{frTypo(toolAskLine(t.ask))}</ThemedText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function VisualBody({ id, notes }: { id: VisualId; notes: Record<string, string> }) {
  switch (id) {
    case 'emotions': return <Emotions />;
    case 'thermometre': return <Thermometre />;
    case 'colonnes': return <Colonnes />;
    case 'escalier': return <Escalier />;
    case 'carte': return <Carte />;
    case 'sens': return <ListVisual items={SENS_ITEMS} />;
    case 'endroits': return <ListVisual items={ENDROITS_ITEMS} />;
    case 'outils': return <Outils notes={notes} />;
  }
}

type Props = {
  /** null : feuille fermée. */
  id: VisualId | null;
  /** Ce que l'enfant a noté, par fiche (activity_id → texte) : alimente « Dans ses mots ». */
  notes: Record<string, string>;
  onClose: () => void;
};

/** Plein écran : le visuel en grand, à montrer à l'enfant. L'état de sélection est remis à zéro à chaque ouverture. */
export function VisualSheet({ id, notes, onClose }: Props) {
  return (
    <Sheet visible={id !== null} onClose={onClose} title={id ? VISUAL_LABELS[id] : ''} detent="large" scroll={false} dim={0.5} closeLabel="Fermer le visuel">
      {id ? (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 4, paddingBottom: 150, paddingHorizontal: 4 }}>
            <ThemedText variant="callout" color="label2" style={{ marginBottom: 18 }}>{frTypo(VISUAL_HINTS[id])}</ThemedText>
            <VisualBody key={id} id={id} notes={notes} />
          </ScrollView>
          <FadeBottom height={150} />
          <View style={{ position: 'absolute', left: 4, right: 4, bottom: 28, zIndex: 46 }}>
            <Button variant="gray" label={VISUAL_BACK} onPress={onClose} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
