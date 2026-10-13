import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Avatar, Card, GlassButton, Icon, LargeTitle, List, ListRow, NavBar, Section, SectionFooter, SectionHeader, Tag, ThemedText,
  resolveTextStyle, useNavBarHeight, useTheme,
} from '../../design';
import { kidAvatarColors } from './kidAvatar';

export type PickableChild = {
  id: string;
  first_name: string;
  /** Âge calculé (ans). */
  age?: number;
  sport?: string | null;
  /** « Séance 8 sur 13 » : libellé déjà prêt. */
  sessionLabel?: string;
  /** Numéro de maillot du passeport (Carnet) ; à défaut, l'initiale. */
  jersey?: string;
};

type Props = {
  childrenList: PickableChild[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** OK (Natif) / Fermer (Carnet). */
  onDone?: () => void;
  onCancel?: () => void;
  onAddChild?: () => void;
  /** Invitation du co-parent : absente tant que la fonction n'existe pas (rangée masquée). */
  onInviteCoParent?: () => void;
  /** Nuit calme : bouton « Modifier » de la barre (absent = masqué). */
  onEdit?: () => void;
};

const detail = (c: PickableChild) => [c.age != null ? `${c.age} ans` : null, c.sport].filter(Boolean).join(' · ');

/**
 * Maquette F · Choisir le profil. Natif : liste système avec coche ; Nuit calme : grands avatars plein écran façon
 * profils de l'app TV ; Carnet : cartes-maillots (le numéro devient la vignette). Vue présentationnelle.
 * Pas encore branchée : aucune sélection d'enfant n'existe côté mobile (pas de selectedChild).
 */
export function ChildPicker(p: Props) {
  const { style, colors, fontsLoaded } = useTheme();
  const navH = useNavBarHeight();
  const { childrenList: kids, selectedId } = p;
  const avatarOf = (i: number) => kidAvatarColors(i, colors, style);

  if (style === 'nuit') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
        <ScrollView contentContainerStyle={{ paddingTop: navH + 42, paddingBottom: 40, alignItems: 'center' }}>
          <ThemedText variant="title1" accessibilityRole="header" style={{ textAlign: 'center' }}>Qui regarde-t-on ?</ThemedText>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 34, marginTop: 56, paddingHorizontal: 16 }}>
            {kids.map((c, i) => {
              const a = avatarOf(i);
              const selected = c.id === selectedId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => p.onSelect(c.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${c.first_name}, ${detail(c)}`}
                  accessibilityState={{ selected }}
                  style={{ alignItems: 'center', gap: 8 }}
                >
                  <View>
                    <Avatar label={c.first_name.slice(0, 1)} size={116} background={a.background} ink={a.ink} />
                    {selected ? (
                      <View pointerEvents="none" style={{ position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: 64, borderWidth: 3, borderColor: colors.tint }} />
                    ) : null}
                  </View>
                  <ThemedText variant="headline" style={{ marginTop: 6 }}>{c.first_name}</ThemedText>
                  <ThemedText variant="foot" color="label2">{detail(c)}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          {p.onAddChild ? (
            <Pressable onPress={p.onAddChild} accessibilityRole="button" accessibilityLabel="Ajouter un enfant" style={{ alignItems: 'center', gap: 8, marginTop: 46 }}>
              <View style={{ width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.label3 }}>
                <Icon name="plus" size={30} color={colors.label2} />
              </View>
              <ThemedText variant="sub" color="label2">Ajouter un enfant</ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
        <NavBar
          right={p.onEdit ? <GlassButton label="Modifier" onPress={p.onEdit} /> : undefined}
          left={p.onCancel ? <GlassButton glyph="close" accessibilityLabel="Fermer" onPress={p.onCancel} /> : undefined}
        />
      </View>
    );
  }

  if (style === 'carnet') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
        <ScrollView contentContainerStyle={{ paddingTop: navH + 8, paddingBottom: 40 }}>
          <LargeTitle subtitle="Tout l’espace suit le profil choisi.">Ce soir, on suit…</LargeTitle>
          <Section style={{ marginTop: 22, gap: 12 }}>
            {kids.map((c, i) => {
              const a = avatarOf(i);
              const selected = c.id === selectedId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => p.onSelect(c.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${c.first_name}, ${detail(c)}${c.sessionLabel ? `, ${c.sessionLabel}` : ''}`}
                  accessibilityState={{ selected }}
                >
                  <Card padding={0}>
                    <View style={{ flexDirection: 'row', minHeight: 132 }}>
                      <View style={{ width: 112, backgroundColor: a.background, alignItems: 'center', justifyContent: 'center' }}>
                        <Text
                          style={[
                            resolveTextStyle('numeralHero', fontsLoaded, style),
                            { fontSize: 54, lineHeight: 54, fontWeight: '800', color: a.ink, fontVariant: [] },
                          ]}
                        >
                          {c.jersey ?? c.first_name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, paddingVertical: 18, paddingHorizontal: 16 }}>
                        <ThemedText variant="displayQuote" style={{ fontSize: 26, lineHeight: 30, fontWeight: '600' }} weight={600}>{c.first_name}</ThemedText>
                        <ThemedText variant="sub" color="label2">{detail(c)}</ThemedText>
                        {c.sessionLabel ? <Tag label={c.sessionLabel} style={{ marginTop: 12 }} /> : null}
                      </View>
                      <View style={{ justifyContent: 'center', paddingRight: 14 }}>
                        <Icon name="chevronRight" size={16} color={colors.label3} strokeWidth={2.4} />
                      </View>
                    </View>
                    {selected ? (
                      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 24, borderWidth: 2, borderColor: colors.tint }} />
                    ) : null}
                  </Card>
                </Pressable>
              );
            })}
            {p.onAddChild ? (
              <Pressable
                onPress={p.onAddChild}
                accessibilityRole="button"
                accessibilityLabel="Ajouter un enfant"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.label4 }}
              >
                <Icon name="plus" size={22} color={colors.tintText} strokeWidth={2.2} />
                <ThemedText variant="headline" color="tintText">Ajouter un enfant</ThemedText>
              </Pressable>
            ) : null}
          </Section>
        </ScrollView>
        <NavBar left={<GlassButton glyph="close" accessibilityLabel="Fermer" onPress={p.onCancel ?? p.onDone ?? (() => {})} />} />
      </View>
    );
  }

  // Natif : liste système avec coche
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: navH + 12, paddingBottom: 40 }}>
        <SectionHeader small title="Enfants suivis" />
        <Section>
          <List>
            {kids.map((c, i) => {
              const a = avatarOf(i);
              const sub = [detail(c), c.sessionLabel].filter(Boolean).join(' · ');
              return (
                <ListRow
                  key={c.id}
                  large
                  leading={<Avatar label={c.first_name.slice(0, 1)} size={44} background={a.background} ink={a.ink} />}
                  leadingInset={72}
                  title={c.first_name}
                  subtitle={sub}
                  checked={c.id === selectedId ? true : undefined}
                  chevron={false}
                  onPress={() => p.onSelect(c.id)}
                  accessibilityLabel={`${c.first_name}, ${sub}`}
                />
              );
            })}
          </List>
          <SectionFooter>Tout l’espace suit le profil choisi : passeport, séances, bilans et messages. Le choix est mémorisé.</SectionFooter>
        </Section>
        {p.onAddChild || p.onInviteCoParent ? (
          <Section style={{ marginTop: 22 }}>
            <List>
              {p.onAddChild ? (
                <ListRow glyph="plus" iconColor="sysBlue" title="Ajouter un enfant" subtitle="La fiche part en confirmation chez l’équipe" onPress={p.onAddChild} />
              ) : null}
              {p.onInviteCoParent ? (
                <ListRow glyph="people" iconColor="sysIndigo" title="Inviter un co-parent" subtitle="Il reçoit son propre accès par courriel" onPress={p.onInviteCoParent} />
              ) : null}
            </List>
            {p.onInviteCoParent ? (
              <SectionFooter>L’abonnement Maison est partagé avec ton co-parent : un seul paiement pour vous deux.</SectionFooter>
            ) : null}
          </Section>
        ) : null}
      </ScrollView>
      <NavBar
        title="Profils"
        left={p.onCancel ? <GlassButton label="Annuler" onPress={p.onCancel} /> : undefined}
        right={p.onDone ? <GlassButton label="OK" tinted onPress={p.onDone} /> : undefined}
      />
    </View>
  );
}
