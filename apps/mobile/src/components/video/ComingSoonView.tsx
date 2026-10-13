import { Platform, ScrollView, View } from 'react-native';
import {
  Button, Card, GlassButton, Icon, LargeTitle, List, ListRow, NavBar, Section, Segmented, ThemedText, VignetteImage,
  useNavBarHeight, useScrollEdge, useTheme, withAlpha,
} from '../../design';
import { SCENE } from './scene';
import { VideoMascot } from './VideoMascot';

export type UpcomingSession = {
  id: string;
  /** Titre affiché sous la vignette, numéro compris (« 1. … »). */
  title: string;
  /** Vignette (ACT-xxxx). */
  vignetteId: string;
};

export type ComingSoonViewProps = {
  /** Prénom de l'enfant : « à vivre avec {prénom} ». Absent : « votre enfant ». */
  childName?: string | null;
  /** « Me prévenir à l'ouverture » (préférence stockée par l'appelant). */
  notify: boolean;
  onNotifyChange: (value: boolean) => void;
  /** « Voir les moments de ce soir » : retour vers Maison. */
  onBackToHome: () => void;
  onBack?: () => void;
  /** Bouton « … » de la barre : absent = non affiché. */
  onMore?: () => void;
  /** Contrôle segmenté (Natif, Nuit calme) : le segment « coach » mène à Mes séances. */
  onSegmentChange?: (key: 'coach' | 'video') => void;
  /**
   * « Ce qui viendra » : les séances vidéo à venir, grisées. Absent ou vide : la liste est masquée
   * (aucune donnée de séance vidéo lisible tant que les séances sont fermées).
   */
  upcoming?: readonly UpcomingSession[];
  /** Espace réservé en bas (barre d'onglets flottante). Défaut 130, comme le canevas. */
  bottomInset?: number;
};

/**
 * O · Bientôt disponible. Natif : grand titre « Séances » + contrôle segmenté ; Nuit calme : « Parcours » + segmenté
 * « Mes séances » ; Carnet : « Séances » sans segmenté. Mascotte avec la pellicule, étiquette « En construction »,
 * « Me prévenir à l'ouverture », retour vers Maison, puis « Ce qui viendra » (vignettes grisées, cadenas).
 */
export function ComingSoonView({
  childName, notify, onNotifyChange, onBackToHome, onBack, onMore, onSegmentChange, upcoming, bottomInset = 130,
}: ComingSoonViewProps) {
  const { colors, style } = useTheme();
  const navH = useNavBarHeight();
  const scroll = useScrollEdge();
  const nuit = style === 'nuit';
  const carnet = style === 'carnet';
  const who = childName?.trim() ? childName.trim() : 'votre enfant';
  const haloColor = nuit ? withAlpha(colors.sun, 0.22) : withAlpha(colors.navy600, 0.14);
  const strip = upcoming && upcoming.length > 0 ? upcoming : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView
        style={{ flex: 1 }}
        onScroll={scroll.onScroll}
        scrollEventThrottle={scroll.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitle>{nuit ? 'Parcours' : 'Séances'}</LargeTitle>
        <View style={{ height: 12 }} />
        {carnet ? null : (
          <Section style={{ marginBottom: 14 }}>
            <Segmented
              accessibilityLabel="Type de séances"
              options={[
                { key: 'coach', label: nuit ? 'Mes séances' : 'Avec le coach' },
                { key: 'video', label: 'Vidéo · bientôt' },
              ]}
              value="video"
              onChange={(k) => onSegmentChange?.(k)}
            />
          </Section>
        )}
        <Section>
          <Card padding={0}>
            <View style={{ paddingTop: 26, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
              <VideoMascot size={168} vignetteId="ACT-1001" halo={haloColor} accessibilityLabel="La mascotte THRIVE avec la pellicule" />
              <View
                accessible
                accessibilityLabel="En construction"
                style={{
                  marginTop: 16, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: SCENE.buildTagBg,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}
              >
                <Icon name="timer" size={12} color={SCENE.buildTagInk} strokeWidth={2.4} />
                <ThemedText variant="cap" weight={600} style={{ color: SCENE.buildTagInk }}>En construction</ThemedText>
              </View>
              <ThemedText variant="title2" accessibilityRole="header" style={{ marginTop: 10, textAlign: 'center' }}>
                Les séances vidéo arrivent bientôt
              </ThemedText>
              <ThemedText variant="sub" color="label2" style={{ marginTop: 6, textAlign: 'center' }}>
                {`On prépare les 13 séances de 20 minutes à vivre avec ${who}. En attendant, les moments Maison sont là pour ce soir.`}
              </ThemedText>
              <List style={{ marginTop: 16, alignSelf: 'stretch', backgroundColor: colors.bgGrouped3 }}>
                <ListRow title="Me prévenir à l’ouverture" toggle={{ value: notify, onChange: onNotifyChange }} />
              </List>
              <Button label="Voir les moments de ce soir" variant="gray" glyph="home" onPress={onBackToHome} style={{ marginTop: 12 }} />
            </View>
          </Card>
        </Section>

        {strip ? (
          <>
            <View
              style={{
                paddingTop: 22, paddingBottom: 8, paddingHorizontal: 4, marginHorizontal: 16, flexDirection: 'row',
                alignItems: 'baseline', justifyContent: 'space-between',
              }}
            >
              <ThemedText variant="sectionTitle" accessibilityRole="header">Ce qui viendra</ThemedText>
              <ThemedText variant="body" color="tintText">{`${strip.length} séances`}</ThemedText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {strip.map((s) => (
                <View key={s.id} style={{ width: 150, opacity: 0.6 }} accessible accessibilityLabel={`${s.title}, bientôt`}>
                  <View style={{ height: 93, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.bgGrouped3 }}>
                    <VignetteImage
                      id={s.vignetteId}
                      style={[
                        { width: '100%', height: '100%' },
                        (Platform.OS === 'web' ? { filter: 'grayscale(0.6)' } : { filter: [{ grayscale: 0.6 }] }) as object,
                      ]}
                    />
                    <View
                      style={{
                        position: 'absolute', left: 8, bottom: 8, height: 22, paddingHorizontal: 8, borderRadius: 11,
                        backgroundColor: SCENE.lockTagBg, flexDirection: 'row', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Icon name="lock" size={11} color={SCENE.white} strokeWidth={2.4} />
                      <ThemedText variant="cap" weight={600} style={{ color: SCENE.white }}>Bientôt</ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="sub" weight={600} numberOfLines={2} style={{ marginTop: 6 }}>{s.title}</ThemedText>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
      <NavBar
        edge={scroll.edge}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack ?? (() => {})} />}
        right={onMore ? <GlassButton glyph="more" accessibilityLabel="Plus d’options" onPress={onMore} /> : undefined}
      />
    </View>
  );
}
