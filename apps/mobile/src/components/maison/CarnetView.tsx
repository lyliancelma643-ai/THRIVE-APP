import { ScrollView, View, useWindowDimensions } from 'react-native';
import {
  Card, Enamel, Felt, GlassButton, Icon, Lamp, LargeTitle, List, ListRow, NavBar, Paper, Section, SectionHeader, ThemedText,
  VignetteImage, useLargeTitle, useNavBarHeight, useTheme,
} from '../../design';
import { POSTER_BG } from './palette';
import type { CarnetVM } from './viewModels';

type Props = {
  vm: CarnetVM;
  onBack: () => void;
  onShare: () => void;
  onOpenActivity: (activityId: string) => void;
};

/**
 * N · Le carnet : ce qu’on garde (avec la vignette de chaque activité), l’objet gagné (l’émail : le seul geste soleil),
 * la collection (papier pour les objets acquis, feutre pour ceux qui se débloquent). Il se remplit tout seul ;
 * jamais de manque ni de score. Identique dans Lin et Veillée. Vue présentationnelle.
 */
export function CarnetView({ vm, onBack, onShare, onOpenActivity }: Props) {
  const { colors, styleKey } = useTheme();
  const { width } = useWindowDimensions();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(40);
  const got = vm.objects.filter((o) => o.got).length;
  const cell = (width - 32 - 30) / 4;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      {styleKey === 'veillee' ? <Lamp /> : null}
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
                <Card key={e.id}>
                  <View accessible accessibilityLabel={`${e.label}. ${e.detail}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Enamel radius={20}>
                      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={e.glyph} size={30} color={colors.accentInk} />
                      </View>
                    </Enamel>
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
                    <View style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', backgroundColor: POSTER_BG }}>
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
              <ThemedText variant="sub" weight={600} color="sageText">{`${got} sur ${vm.objects.length}`}</ThemedText>
            </View>
            <Section style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {vm.objects.map((o) => {
                const label = o.got ? `${o.label}, acquis pour toujours` : `${o.label}, se débloque en avançant`;
                const tile = { width: cell, height: cell, alignItems: 'center' as const, justifyContent: 'center' as const };
                return o.got ? (
                  <Paper key={o.id} accessible accessibilityLabel={label} radius={20}>
                    <View style={tile}><Icon name={o.glyph} size={28} color={colors.sageInk} /></View>
                  </Paper>
                ) : (
                  <Felt key={o.id} accessible accessibilityLabel={label} radius={20} color={colors.fill4}>
                    <View style={tile}><Icon name="lock" size={28} color={colors.label4} /></View>
                  </Felt>
                );
              })}
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
