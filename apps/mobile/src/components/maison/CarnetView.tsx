import { ScrollView, View, useWindowDimensions } from 'react-native';
import {
  Card, GlassButton, Icon, LargeTitle, List, ListRow, NavBar, Section, SectionHeader, ThemedText, VignetteImage, useLargeTitle,
  useNavBarHeight, useTheme, withAlpha,
} from '../../design';
import type { CarnetVM } from './viewModels';

type Props = {
  vm: CarnetVM;
  onBack: () => void;
  onShare: () => void;
  onOpenActivity: (activityId: string) => void;
};

/**
 * N · Le carnet : ce qu’on garde (avec la vignette de chaque activité), l’objet gagné, la collection.
 * Il se remplit tout seul ; jamais de manque ni de score. Vue présentationnelle.
 */
export function CarnetView({ vm, onBack, onShare, onOpenActivity }: Props) {
  const { colors, style } = useTheme();
  const { width } = useWindowDimensions();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(40);
  const got = vm.objects.filter((o) => o.got).length;
  const cell = (width - 32 - 30) / 4;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitle subtitle="Il se remplit tout seul, moment après moment.">Le carnet</LargeTitle>

        {vm.earned.length > 0 ? (
          <>
            <SectionHeader title="Gagné" />
            <Section style={{ gap: 8 }}>
              {vm.earned.map((e) => (
                <Card key={e.id} padding={0}>
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: withAlpha(colors.accent, style === 'nuit' ? 0.06 : 0.28) }} />
                  <View accessible accessibilityLabel={`${e.label}. ${e.detail}`} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={e.glyph} size={32} color={colors.accentInk} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="headline">{e.label}</ThemedText>
                      <ThemedText variant="sub" color="label2">{e.detail}</ThemedText>
                    </View>
                  </View>
                </Card>
              ))}
            </Section>
          </>
        ) : null}

        <SectionHeader title="Ce qu’on garde" />
        <Section>
          {vm.kept.length === 0 ? (
            <Card>
              <ThemedText variant="sub" color="label2">{`Les phrases que vous gardez avec ${vm.firstName} s’afficheront ici.`}</ThemedText>
            </Card>
          ) : (
            <List>
              {vm.kept.map((k) => (
                <ListRow
                  key={k.id}
                  title={k.title}
                  subtitle={k.phrase ? `${k.detail} · « ${k.phrase} »` : k.detail}
                  leading={
                    <View style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.bgGrouped3 }}>
                      <VignetteImage id={k.vignetteId} style={{ width: 48, height: 48 }} />
                    </View>
                  }
                  leadingInset={76}
                  onPress={() => onOpenActivity(k.activityId)}
                />
              ))}
            </List>
          )}
        </Section>

        {vm.objects.length > 0 ? (
          <>
            <View style={{ marginHorizontal: 16, paddingTop: 22, paddingBottom: 8, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <ThemedText variant="sectionTitle" accessibilityRole="header">Objets</ThemedText>
              <ThemedText variant="body" color="tintText">{`${got} sur ${vm.objects.length}`}</ThemedText>
            </View>
            <Section style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {vm.objects.map((o) => (
                <View
                  key={o.id}
                  accessible
                  accessibilityLabel={o.got ? `${o.label}, acquis pour toujours` : `${o.label}, se débloque en avançant`}
                  style={{
                    width: cell, height: cell, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: o.got ? colors.tintSoft : colors.fill4,
                  }}
                >
                  <Icon name={o.got ? o.glyph : 'lock'} size={28} color={o.got ? colors.tintText : colors.label4} />
                </View>
              ))}
            </Section>
          </>
        ) : null}
      </ScrollView>
      <NavBar
        edge={lt.edge}
        title="Le carnet"
        titleVisible={lt.titleVisible}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
        right={vm.kept.length > 0 ? <GlassButton glyph="share" accessibilityLabel="Partager le carnet" onPress={onShare} /> : undefined}
      />
    </View>
  );
}
