import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Avatar, GlassButton, List, ListRow, NavBar, Section, SectionHeader, ThemedText, useNavBarHeight, useScrollEdge,
  useTheme, type ThemeStyleKey,
} from '../../design';
import { kidAvatarColors } from './kidAvatar';
import { RoundBadge } from './RoundBadge';
import { StylePickerView } from './StylePicker';

export type AccountFamilyItem = { id: string; firstName: string; ageLabel: string };

export type AccountViewProps = {
  /** Nom complet et courriel du parent connecté (données réelles). */
  name: string;
  email: string;
  /** Valeur à droite de « Mon programme » (ex. « Actif », « Aucun »). */
  programValue?: string;
  /** Valeur à droite de « Abonnement Maison » (ex. « Inclus », « Essai · 24 j », « Actif »). */
  maisonValue?: string;
  styleChoice: ThemeStyleKey;
  onChangeStyle: (k: ThemeStyleKey) => void;
  family: AccountFamilyItem[];
  onOpenProgram: () => void;
  onOpenMaison: () => void;
  onOpenOffers: () => void;
  onOpenChild: (id: string) => void;
  onOpenChildren: () => void;
  onOpenNotifications: () => void;
  onDone: () => void;
  onSignOut: () => void;
  /** Bannière en tête (problème de paiement). */
  top?: ReactNode;
  /** Blocs additionnels avant « Données » (avertissement santé). */
  beforeData?: ReactNode;
  /** Section « Données · hébergées au Canada » (liens légaux, suppression du compte). */
  data?: ReactNode;
};

/**
 * Maquette X · Compte & famille (identique en Lin et en Veillée) : avatar et identité, Mon programme / Abonnement Maison /
 * Offres, Style de l'app (Lin · Veillée), Famille, Préférences, Données, Se déconnecter.
 * Tout ce que le produit n'a pas encore (co-parent, notifications push en bascule, double authentification, export)
 * n'est pas affiché.
 */
export function AccountView(p: AccountViewProps) {
  const { colors, styleKey } = useTheme();
  const navH = useNavBarHeight();
  const scroll = useScrollEdge();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView onScroll={scroll.onScroll} scrollEventThrottle={scroll.scrollEventThrottle} contentContainerStyle={{ paddingTop: navH, paddingBottom: 40 }}>
        {p.top ? <Section style={{ marginTop: 8 }}>{p.top}</Section> : null}
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <Avatar label={p.name.slice(0, 1) || '·'} size={84} background={colors.fill} ink={colors.label} accessibilityLabel={p.name} />
          <ThemedText variant="title2" style={{ marginTop: 10, textAlign: 'center' }} accessibilityRole="header">{p.name}</ThemedText>
          <ThemedText variant="sub" color="label2">{p.email}</ThemedText>
        </View>

        <Section style={{ marginTop: 18 }}>
          <List>
            <ListRow leading={<RoundBadge glyph="star" />} leadingInset={60} title="Mon programme" value={p.programValue} onPress={p.onOpenProgram} chevron />
            <ListRow leading={<RoundBadge glyph="home" />} leadingInset={60} title="Abonnement Maison" value={p.maisonValue} onPress={p.onOpenMaison} chevron />
            <ListRow leading={<RoundBadge glyph="sparkles" />} leadingInset={60} title="Offres THRIVE" onPress={p.onOpenOffers} chevron />
          </List>
        </Section>

        <SectionHeader small title="Style de l’app" />
        <Section>
          <StylePickerView value={p.styleChoice} onChange={p.onChangeStyle} />
        </Section>

        <SectionHeader small title="Famille" />
        <Section>
          <List>
            {p.family.map((c, i) => {
              const a = kidAvatarColors(i, colors, styleKey);
              return (
                <ListRow
                  key={c.id}
                  leading={<Avatar label={c.firstName.slice(0, 1)} size={30} background={a.background} ink={a.ink} />}
                  leadingInset={60}
                  title={c.firstName}
                  value={c.ageLabel}
                  chevron
                  onPress={() => p.onOpenChild(c.id)}
                />
              );
            })}
            <ListRow leading={<RoundBadge glyph="people" />} leadingInset={60} title="Mes enfants" onPress={p.onOpenChildren} chevron />
          </List>
        </Section>

        <SectionHeader small title="Préférences" />
        <Section>
          <List>
            <ListRow leading={<RoundBadge glyph="bell" />} leadingInset={60} title="Notifications" onPress={p.onOpenNotifications} chevron />
          </List>
        </Section>

        {p.beforeData ? <View style={{ marginTop: 22, marginHorizontal: 16 }}>{p.beforeData}</View> : null}
        {p.data}

        <Section style={{ marginTop: 22 }}>
          <List>
            <ListRow title="Se déconnecter" destructive onPress={p.onSignOut} />
          </List>
        </Section>
      </ScrollView>
      <NavBar
        title="Compte"
        edge={scroll.edge}
        right={<GlassButton glyph="check" tinted accessibilityLabel="OK" onPress={p.onDone} />}
      />
    </View>
  );
}
