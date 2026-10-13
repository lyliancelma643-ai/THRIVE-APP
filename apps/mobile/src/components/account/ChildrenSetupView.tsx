import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button, Field, GlassButton, GlassSurface, Icon, List, MenuPopover, NavBar, ProgressBar, Section, SectionFooter, SectionHeader,
  ThemedText, useNavBarHeight, useTheme,
} from '../../design';

export const AGE_MIN = 8;
export const AGE_MAX = 17;
/** Menu « Sport » du canevas : vocabulaire d'interface (la valeur choisie est enregistrée telle quelle). */
export const SPORT_OPTIONS = ['Hockey', 'Soccer', 'Natation', 'Basketball', 'Gymnastique', 'Tennis', 'Autre sport'] as const;

export type ChildDraft = { key: string; firstName: string; age: number; sport: string };

export type ChildrenSetupViewProps = {
  drafts: ChildDraft[];
  onChange: (key: string, patch: Partial<Omit<ChildDraft, 'key'>>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Étape d'inscription « 2 sur 2 » (barre de progression). Absent : ajout depuis « Mes enfants ». */
  step?: { index: number; total: number };
  canContinue: boolean;
  loading?: boolean;
  error?: string;
  /** Ouvre le menu Sport de cet enfant au premier rendu (galerie DEV). */
  initialSportMenu?: string;
};

function Stepper({ value, onChange, name }: { value: number; onChange: (v: number) => void; name: string }) {
  const { colors } = useTheme();
  const cell = (label: string, delta: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${delta < 0 ? 'Moins' : 'Plus'} d’âge pour ${name}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(Math.min(AGE_MAX, Math.max(AGE_MIN, value + delta)))}
      hitSlop={{ top: 6, bottom: 6 }}
      style={{ width: 40, height: 34, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}
    >
      <ThemedText style={{ fontSize: 20, lineHeight: 24, color: colors.label }}>{label}</ThemedText>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 4, height: 34, borderRadius: 17, backgroundColor: colors.fill3 }}>
      {cell('−', -1, value <= AGE_MIN)}
      {cell('+', 1, value >= AGE_MAX)}
    </View>
  );
}

const MENU_ROW = 44;

/**
 * Maquette D · Inscription, les enfants (étape 2 sur 2) : un bloc Prénom / Âge (stepper 8–17) / Sport (menu en verre)
 * par enfant, « Retirer », « Ajouter un enfant » et barre Continuer. Vue présentationnelle (brouillons + callbacks).
 */
export function ChildrenSetupView(p: ChildrenSetupViewProps) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [menuFor, setMenuFor] = useState<string | null>(p.initialSportMenu ?? null);
  const [anchor, setAnchor] = useState<{ y: number; h: number } | null>(null);
  const fieldRefs = useRef<Record<string, View | null>>({});

  const measure = (key: string) => {
    fieldRefs.current[key]?.measureInWindow((_x, y, _w, h) => setAnchor({ y, h }));
  };
  const openMenu = (key: string) => {
    setMenuFor(key);
    measure(key);
  };
  const menuHeight = 12 + SPORT_OPTIONS.length * MENU_ROW;
  const below = anchor ? anchor.y + anchor.h + 4 : 0;
  const menuTop = anchor ? (below + menuHeight > win.height - 24 ? Math.max(navH, anchor.y + anchor.h - menuHeight) : below) : -9999;
  const active = p.drafts.find((d) => d.key === menuFor);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgGrouped }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: navH + 8, paddingBottom: 140 }}>
        {p.step ? (
          <Section>
            <ProgressBar value={p.step.index / p.step.total} accessibilityLabel={`Étape ${p.step.index} sur ${p.step.total}`} valueText={`${p.step.index} sur ${p.step.total}`} />
          </Section>
        ) : null}
        <View style={{ marginTop: p.step ? 22 : 4, paddingHorizontal: 16 }}>
          <ThemedText variant="title2" accessibilityRole="header">Tes enfants</ThemedText>
          <ThemedText variant="sub" color="label2" style={{ marginTop: 4 }}>
            De 8 à 17 ans. Le parcours s’adapte à sa tranche d’âge.
          </ThemedText>
        </View>

        {p.drafts.map((d, i) => (
          <View key={d.key}>
            <View style={{ marginHorizontal: 16, paddingTop: 22, paddingBottom: 7, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <ThemedText variant="foot" color="label2" accessibilityRole="header" style={{ textTransform: 'uppercase' }}>{`Enfant ${i + 1}`}</ThemedText>
              {i > 0 ? (
                <Pressable onPress={() => p.onRemove(d.key)} accessibilityRole="button" accessibilityLabel={`Retirer l’enfant ${i + 1}`} hitSlop={10}>
                  <ThemedText variant="foot" color="sysRed">Retirer</ThemedText>
                </Pressable>
              ) : null}
            </View>
            <Section>
              <List>
                <Field label="Prénom" value={d.firstName} onChangeText={(v) => p.onChange(d.key, { firstName: v })} autoComplete="off" returnKeyType="next" />
                <Field label="Âge" accessibilityLabel={`Âge, ${d.age} ans`} right={<Stepper value={d.age} onChange={(v) => p.onChange(d.key, { age: v })} name={d.firstName || `enfant ${i + 1}`} />}>
                  <ThemedText variant="body">{`${d.age} ans`}</ThemedText>
                </Field>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Sport, ${d.sport || 'à choisir'}`}
                  onPress={() => openMenu(d.key)}
                  ref={(r) => { fieldRefs.current[d.key] = r as unknown as View | null; }}
                  onLayout={() => { if (menuFor === d.key && !anchor) measure(d.key); }}
                >
                  <Field label="Sport" last right={<Icon name="chevronUpDown" size={16} color={colors.label3} strokeWidth={2.2} />}>
                    <ThemedText variant="body" color={d.sport ? 'label' : 'label3'}>{d.sport || 'Choisir'}</ThemedText>
                  </Field>
                </Pressable>
              </List>
            </Section>
          </View>
        ))}

        <Section style={{ marginTop: 14 }}>
          <Button variant="gray" glyph="plus" label="Ajouter un enfant" onPress={p.onAdd} />
        </Section>

        <SectionFooter style={{ marginHorizontal: 16, paddingTop: 14 }}>
          En ajoutant votre enfant, vous confirmez être titulaire de l’autorité parentale et consentez, en son nom, au traitement de ces
          renseignements pour le suivi de son programme THRIVE. Ils ne sont accessibles qu’à son coach et à l’équipe THRIVE.
        </SectionFooter>
        {p.error ? (
          <View accessibilityRole="alert" style={{ paddingTop: 10, paddingHorizontal: 32 }}>
            <ThemedText variant="sub" color="sysRed">{p.error}</ThemedText>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 16) }}>
        <GlassSurface radius={30} style={{ padding: 6 }}>
          <Button label={p.loading ? 'Enregistrement...' : 'Continuer'} onPress={p.onContinue} disabled={!p.canContinue || p.loading} testID="children-continue" />
        </GlassSurface>
      </View>

      <NavBar
        title={p.step ? 'Créer le compte' : 'Ajouter un enfant'}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={p.onBack} />}
        right={p.step ? <ThemedText variant="sub" color="label2">{`${p.step.index} sur ${p.step.total}`}</ThemedText> : undefined}
      />

      <MenuPopover
        visible={menuFor !== null && anchor !== null}
        onClose={() => { setMenuFor(null); setAnchor(null); }}
        top={menuTop}
        right={30}
        style={{ minWidth: 210 }}
        items={SPORT_OPTIONS.map((s, i) => ({
          label: s,
          checked: active?.sport === s,
          separator: i > 0,
          onPress: () => active && p.onChange(active.key, { sport: s }),
        }))}
      />
    </KeyboardAvoidingView>
  );
}
