import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button, Card, GlassButton, Icon, Lamp, LargeTitle, List, NavBar, Section, SectionHeader, ThemedText,
  useLargeTitle, useNavBarHeight, useTheme,
} from '../../design';
import { LinkedText } from './LinkedText';
import type { consultPage } from './logic';

type Props = {
  page: ReturnType<typeof consultPage>;
  onBack: () => void;
  /** Ouvre un lien `tel:` ou `sms:` (injecté par la route : `Linking.openURL`). */
  onOpen: (url: string) => void;
};

/**
 * K5 · Quand consulter : « Sans attendre » (Appeler / Texto, liseré d'alerte), les signaux, « Vers qui se tourner, au Québec »
 * (numéros appelables), puis la phrase finale. Les boutons d'appel sont gris : aucun geste soleil, aucune alarme criarde.
 * Le statut de validation du texte n'est jamais affiché.
 */
export function PageConsulterView({ page, onBack, onOpen }: Props) {
  const { colors, styleKey } = useTheme();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(40);
  const u = page.urgent;

  const lines = (items: string[], link: boolean) => (
    <Section>
      <List>
        {items.map((it, i) => (
          <View
            key={it}
            style={{
              minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center',
              borderBottomWidth: i < items.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.separator,
            }}
          >
            {link ? (
              <LinkedText text={it} variant="body" style={{ fontSize: 15.5, lineHeight: 22, letterSpacing: -0.2 }} />
            ) : (
              <ThemedText variant="body" style={{ fontSize: 15.5, lineHeight: 22, letterSpacing: -0.2 }}>{it}</ThemedText>
            )}
          </View>
        ))}
      </List>
    </Section>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      {styleKey === 'veillee' ? <Lamp /> : null}
      <ScrollView
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 60 }}
      >
        <LargeTitle>{page.title}</LargeTitle>
        <Section style={{ marginTop: 10 }}>
          <ThemedText variant="body" color="label2" style={{ fontSize: 16, lineHeight: 24 }}>{page.intro}</ThemedText>
        </Section>

        <Section style={{ marginTop: 18 }}>
          <Card padding={18} style={{ borderColor: colors.bad, borderWidth: 1.5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="phone" size={20} color={colors.bad} />
              <ThemedText variant="headline" accessibilityRole="header">{u.title}</ThemedText>
            </View>
            <LinkedText text={u.text} variant="body" style={{ marginTop: 8, fontSize: 15.5, lineHeight: 22 }} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button label={u.callLabel} variant="gray" size="md" flex onPress={() => onOpen(u.callUrl)} />
              <Button label={u.textLabel} variant="gray" size="md" flex onPress={() => onOpen(u.textUrl)} />
            </View>
          </Card>
        </Section>

        <SectionHeader small title={page.signals.title} />
        {lines(page.signals.items, false)}

        <SectionHeader small title={page.whoToCall.title} />
        {lines(page.whoToCall.items, true)}
        <Section style={{ marginTop: 8 }}>
          <ThemedText variant="foot" color="label2" style={{ paddingHorizontal: 16 }}>{page.inApp}</ThemedText>
        </Section>
      </ScrollView>
      <NavBar
        edge={lt.edge}
        title={page.title}
        titleVisible={lt.titleVisible}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
      />
    </View>
  );
}
