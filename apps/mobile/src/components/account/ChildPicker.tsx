import { Pressable, ScrollView, View } from 'react-native';
import {
  Enamel, GlassButton, Icon, Lamp, LargeTitle, List, ListRow, MATERIALS, NavBar, Section, SectionFooter, Tag, ThemedText,
  useNavBarHeight, useTheme,
} from '../../design';
import { JerseyArch } from './JerseyArch';
import { kidAvatarColors } from './kidAvatar';

export type PickableChild = {
  id: string;
  first_name: string;
  /** Âge calculé (ans). */
  age?: number;
  sport?: string | null;
  /** « Séance 8 sur 13 » : libellé déjà prêt. */
  sessionLabel?: string;
  /** Numéro de maillot du passeport ; à défaut, l'initiale. */
  jersey?: string;
};

type Props = {
  childrenList: PickableChild[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** « OK » de la barre (absent = masqué, et « Modifier » prend la place s'il existe). */
  onDone?: () => void;
  /** Fermer (croix de la barre). */
  onCancel?: () => void;
  onAddChild?: () => void;
  /** Invitation du co-parent : absente tant que la fonction n'existe pas (rangée masquée). */
  onInviteCoParent?: () => void;
  /** « Modifier » de la barre (absent = masqué). */
  onEdit?: () => void;
};

const detail = (c: PickableChild) => [c.age != null ? `${c.age} ans` : null, c.sport].filter(Boolean).join(' · ');

/**
 * Maquette F · Choisir le profil : « Ce soir, on suit… », deux arches-portraits par rangée (l'arche de lin × le maillot
 * de l'enfant, son numéro en Fraunces), coche en émail sur le profil choisi (le seul geste soleil), « Ajouter un
 * enfant » en pointillés. Même mise en page en Lin et en Veillée. Vue présentationnelle : pas encore branchée, aucune
 * sélection d'enfant n'existe côté mobile (pas de selectedChild).
 */
export function ChildPicker(p: Props) {
  const { colors, styleKey } = useTheme();
  const navH = useNavBarHeight();
  const { childrenList: kids, selectedId } = p;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <Lamp />
      <ScrollView contentContainerStyle={{ paddingTop: navH + 4, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <ThemedText variant="eyebrow" color="sageText">Profils</ThemedText>
        </View>
        <LargeTitle subtitle="Tout l’espace suit le profil choisi : passeport, séances, bilans et messages.">Ce soir, on suit…</LargeTitle>

        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 26, marginTop: 26, paddingHorizontal: 16 }}>
          {kids.map((c, i) => {
            const a = kidAvatarColors(i, colors, styleKey);
            const selected = c.id === selectedId;
            const label = `${c.first_name}, ${detail(c)}${c.sessionLabel ? `, ${c.sessionLabel}` : ''}`;
            return (
              <Pressable
                key={c.id}
                testID={`child-${c.id}`}
                onPress={() => p.onSelect(c.id)}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                style={{ width: '50%', alignItems: 'center', minWidth: 0 }}
              >
                <View>
                  <JerseyArch label={c.jersey ?? c.first_name.slice(0, 1).toUpperCase()} background={a.background} ink={a.ink} width={156} height={196} />
                  {selected ? (
                    <Enamel radius={17} style={{ position: 'absolute', right: 2, bottom: 8, width: 34, height: 34, borderRadius: 17 }}>
                      <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="check" size={18} color={MATERIALS.enamel.ink} strokeWidth={3} />
                      </View>
                    </Enamel>
                  ) : null}
                </View>
                <ThemedText variant="title2" style={{ marginTop: 14 }} numberOfLines={1}>{c.first_name}</ThemedText>
                <ThemedText variant="sub" color="label2" numberOfLines={1}>{detail(c)}</ThemedText>
                {c.sessionLabel ? <Tag label={c.sessionLabel} style={{ marginTop: 8 }} /> : null}
              </Pressable>
            );
          })}
        </View>

        {p.onAddChild ? (
          <Section style={{ marginTop: 26 }}>
            <Pressable
              onPress={p.onAddChild}
              accessibilityRole="button"
              accessibilityLabel="Ajouter un enfant"
              style={{
                minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 26,
                borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.label4,
              }}
            >
              <Icon name="plus" size={24} color={colors.tintText} strokeWidth={2.2} />
              <ThemedText variant="headline" color="tintText">Ajouter un enfant</ThemedText>
            </Pressable>
          </Section>
        ) : null}

        {p.onInviteCoParent ? (
          <Section style={{ marginTop: 14 }}>
            <List>
              <ListRow glyph="people" iconColor="sysIndigo" title="Inviter un co-parent" subtitle="Il reçoit son propre accès par courriel" onPress={p.onInviteCoParent} />
            </List>
            <SectionFooter>L’abonnement Maison est partagé avec ton co-parent : un seul paiement pour vous deux.</SectionFooter>
          </Section>
        ) : null}
      </ScrollView>
      <NavBar
        left={p.onCancel ? <GlassButton glyph="close" accessibilityLabel="Fermer" onPress={p.onCancel} /> : undefined}
        right={
          p.onEdit ? <GlassButton label="Modifier" onPress={p.onEdit} />
            : p.onDone ? <GlassButton label="OK" onPress={p.onDone} /> : undefined
        }
      />
    </View>
  );
}
