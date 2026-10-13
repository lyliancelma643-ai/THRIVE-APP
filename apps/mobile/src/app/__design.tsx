import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Arch, Avatar, Button, Card, Chip, Chips, Enamel, Felt, Field, FloatingTabBar, GlassButton, GlassGroup, GlassMenu, GlassPair,
  Grid2, ICON_NAMES, Icon, Kicker, LargeTitle, List, ListRow, LockOverlay, MascotMedallion, MutedPreview, NavBar, Paper,
  Pills, ProgressBar, Section, SectionFooter, SectionHeader, Segmented, Sheet, Slider, Star, THEME_STYLE_KEYS,
  THEME_STYLE_LABELS, Tag, ThemeScope, ThemedText, Toggle, Velvet, tabLayoutFor, useLargeTitle,
  useNavBarHeight, useTheme, type ThemeStyleKey, type TextStyleName,
} from '../design';

/**
 * Galerie de contrôle des primitives (DEV uniquement) : toutes les briques du canevas Claude Design dans le style
 * courant, avec un sélecteur des deux styles (Lin, Veillée) et les matières. Route /__design — jamais livrée (redirige hors DEV).
 */
const SCALE: TextStyleName[] = ['largetitle', 'title1', 'title2', 'title3', 'headline', 'body', 'callout', 'sub', 'foot', 'cap', 'cap2'];

export default function DesignGallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}

function Gallery() {
  const { colors, styleKey, setStyle } = useTheme();
  const navH = useNavBarHeight();
  const lt = useLargeTitle();
  const [seg, setSeg] = useState<'coach' | 'video'>('coach');
  const [tgl, setTgl] = useState(true);
  const [tgl2, setTgl2] = useState(false);
  const [slider, setSlider] = useState(6);
  const [sheet, setSheet] = useState<'none' | 'medium' | 'large'>('none');
  const [email, setEmail] = useState('camille@exemple.ca');
  const [pwd, setPwd] = useState('');
  const layout = tabLayoutFor(styleKey);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID="design-gallery">
      <ScrollView
        style={{ flex: 1 }}
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 24 }}
      >
        <LargeTitle subtitle="Primitives du canevas Claude Design">Galerie</LargeTitle>

        <SectionHeader small title="Style de l'app" />
        <Section>
          <Segmented
            options={THEME_STYLE_KEYS.map((k) => ({ key: k, label: THEME_STYLE_LABELS[k] }))}
            value={styleKey}
            onChange={(k: ThemeStyleKey) => setStyle(k)}
            accessibilityLabel="Style de l'app"
          />
        </Section>

        <SectionHeader small title="Matières" />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Paper laid framed padding={16}>
            <ThemedText variant="title3">Papier vergé, encre marine</ThemedText>
            <ThemedText variant="sub" color="label2">Dans les deux styles, l'encre du papier reste marine.</ThemedText>
          </Paper>
          <Felt strong padding={16}>
            <ThemedText variant="headline">Feutre : ce qu'on touche</ThemedText>
          </Felt>
          <Velvet padding={16}>
            <ThemedText variant="headline">Velours côtelé : la semaine</ThemedText>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Star on size={36} />
              <Star size={36} />
              <Star size={36} />
            </View>
          </Velvet>
          <Enamel padding={16}>
            <ThemedText variant="headline">Émail : le seul geste jaune</ThemedText>
          </Enamel>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            <Arch size="md" width={120} />
            <Arch size="sm" width={84} />
            <Arch size="xs" width={56} />
          </View>
          <ThemeScope style="veillee" fill containerStyle={{ flex: 0, height: 96, borderRadius: 20, overflow: 'hidden', padding: 16 }}>
            <ThemedText variant="headline">ThemeScope veillee (mode activité)</ThemedText>
          </ThemeScope>
        </View>

        <SectionHeader title="Médaillons" action={{ label: 'Tout voir', onPress: () => {} }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 12 }}>
          <MascotMedallion size={220} withLogo />
          <View style={{ gap: 28, alignItems: 'center' }}>
            <MascotMedallion size={112} />
            <MascotMedallion size={76} />
          </View>
        </View>

        <SectionHeader title="Typographie" />
        <Section>
          <Card>
            {SCALE.map((v) => (
              <ThemedText key={v} variant={v} numberOfLines={1}>{v} — Grandir par le sport</ThemedText>
            ))}
          </Card>
        </Section>

        <SectionHeader small title="Liste inset grouped" />
        <Section>
          <List>
            <ListRow glyph="sparkles" iconColor="tint" title="Mon programme" value="Individuel" onPress={() => {}} />
            <ListRow glyph="home" iconColor="sysGreen" title="Abonnement Maison" value="Inclus" onPress={() => {}} />
            <ListRow glyph="bell" iconColor="sysRed" title="Notifications push" toggle={{ value: tgl, onChange: setTgl }} />
            <ListRow glyph="star" iconColor="sysOrange" title="Avec description" subtitle="Texte secondaire sur une ligne" onPress={() => {}} />
            <ListRow title="Se déconnecter" destructive onPress={() => {}} />
          </List>
          <SectionFooter>Mot de passe oublié ? <ThemedText variant="foot" color="tintText">Recevoir un lien</ThemedText></SectionFooter>
        </Section>

        <SectionHeader small title="Choisir le profil" />
        <Section>
          <List>
            <ListRow
              large
              leading={<Avatar label="L" size={44} />}
              leadingInset={72}
              title="Léo"
              subtitle="11 ans · Hockey · Séance 8 sur 13"
              checked
              onPress={() => {}}
            />
            <ListRow large leading={<Avatar label="I" size={44} background={colors.sageInk} />} leadingInset={72} title="Inès" subtitle="14 ans · Natation" onPress={() => {}} />
            <ListRow large glyph="plus" iconColor="sysBlue" title="Ajouter un enfant" subtitle="La fiche part en confirmation" onPress={() => {}} />
          </List>
        </Section>

        <SectionHeader small title="Champs" />
        <Section>
          <List>
            <Field label="Courriel" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Field label="Mot de passe" value={pwd} onChangeText={setPwd} placeholder="8 caractères minimum" secureTextEntry />
            <Field label="Sport"><ThemedText variant="body" color="label2">Hockey</ThemedText></Field>
          </List>
        </Section>

        <SectionHeader small title="Boutons" />
        <Section style={{ gap: 12 }}>
          <Button label="Essayer 1 mois gratuitement" onPress={() => {}} />
          <Button label="Voir les offres" variant="gray" onPress={() => {}} />
          <Button label="J'ai déjà un compte" variant="plain" onPress={() => {}} />
          <Button label="Verre neutre" variant="plainglass" onPress={() => {}} />
          <Button label="Lancer · 20 min" variant="accent" glyph="play" onPress={() => {}} />
          <Button label="Supprimer" variant="danger" onPress={() => {}} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="md" label="Détail" variant="gray" flex onPress={() => {}} />
            <Button size="md" label="Réserver" flex onPress={() => {}} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" label="Petit" onPress={() => {}} />
            <Button size="sm" label="Petit gris" variant="gray" onPress={() => {}} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={() => {}} />
            <GlassButton label="Annuler" onPress={() => {}} />
            <GlassButton glyph="check" tinted accessibilityLabel="OK" onPress={() => {}} />
            <GlassPair items={[{ glyph: 'bell', accessibilityLabel: 'Notifications', onPress: () => {}, badge: true }, { glyph: 'person', accessibilityLabel: 'Compte', onPress: () => {} }]} />
          </View>
        </Section>

        <SectionHeader small title="Tags · pastilles · segments · progression" />
        <Section style={{ gap: 14 }}>
          <Pills>
            <Tag label="Niveau A" />
            <Tag label="Faite" tone="ok" glyph="check" />
            <Tag label="Bientôt" tone="gray" />
          </Pills>
          <Chips>
            <Chip label="10 min" />
            <Chip label="20 min" on />
            <Chip label="30 min" />
            <Chip label="Rappel" glyph="bell" />
          </Chips>
          <Segmented options={[{ key: 'coach', label: 'Avec le coach' }, { key: 'video', label: 'Vidéo · bientôt' }]} value={seg} onChange={setSeg} />
          <ProgressBar value={7 / 13} accessibilityLabel="Progression" valueText="7 sur 13" />
          <Slider value={slider} onChange={setSlider} min={1} max={10} accessibilityLabel="Humeur" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Toggle value={tgl2} onValueChange={setTgl2} accessibilityLabel="Option" />
            <Toggle value={!tgl2} onValueChange={(v) => setTgl2(!v)} accessibilityLabel="Option 2" />
          </View>
        </Section>

        <SectionHeader title="Cartes" />
        <Section style={{ gap: 12 }}>
          <Grid2>
            <Card><Kicker glyph="sparkles">Compétences de vie</Kicker><ThemedText variant="title1" style={{ marginTop: 8 }}>67</ThemedText></Card>
            <Card><Kicker glyph="pulse">Bien-être</Kicker><ThemedText variant="title1" style={{ marginTop: 8 }}>4,1</ThemedText></Card>
          </Grid2>
          <Card onPress={() => {}} accessibilityLabel="Carte pressable">
            <Kicker glyph="target">Objectif de saison</Kicker>
            <ThemedText variant="title3" style={{ marginTop: 6 }}>Revenir au calme en moins de 30 secondes.</ThemedText>
          </Card>
        </Section>

        <SectionHeader title="Menu · feuilles · verrou" />
        <Section style={{ gap: 12 }}>
          <GlassMenu
            items={[
              { label: 'Hockey', onPress: () => {}, checked: true },
              { label: 'Natation', onPress: () => {} },
              { label: 'Autre…', onPress: () => {}, separator: true },
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" label="Feuille flottante" variant="gray" onPress={() => setSheet('medium')} />
            <Button size="sm" label="Grande feuille" variant="gray" onPress={() => setSheet('large')} />
          </View>
          <View style={{ height: 220, borderRadius: 26, overflow: 'hidden' }}>
            <LockOverlay
              align="end"
              preview={
                <MutedPreview>
                  <Card><Kicker>Passeport d'athlète</Kicker><ThemedText variant="title1">Exemple</ThemedText></Card>
                  <Card style={{ marginTop: 8 }}><ThemedText variant="title2">Aperçu</ThemedText></Card>
                </MutedPreview>
              }
            >
              <Card style={{ margin: 8 }}>
                <Kicker glyph="lock">Avec un programme THRIVE</Kicker>
                <ThemedText variant="headline">Le Bilan s'ouvre avec un coach</ThemedText>
              </Card>
            </LockOverlay>
          </View>
        </Section>

        <SectionHeader title="Icônes" />
        <Section>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {ICON_NAMES.map((n) => (
              <View key={n} style={{ alignItems: 'center', width: 54 }}>
                <Icon name={n} size={24} color={colors.tintText} />
                <ThemedText variant="cap2" color="label2" numberOfLines={1} style={{ fontSize: 9 }}>{n}</ThemedText>
              </View>
            ))}
          </View>
        </Section>

        <SectionHeader title="Barre d'onglets" />
        <Section style={{ gap: 8 }}>
          <ThemedText variant="foot" color="label2">Style courant : {THEME_STYLE_LABELS[styleKey]}</ThemedText>
        </Section>
      </ScrollView>

      <NavBar
        title="Galerie"
        titleVisible={lt.titleVisible}
        edge={lt.edge}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={() => {}} />}
        right={
          <GlassGroup>
            <GlassPair items={[{ glyph: 'bell', accessibilityLabel: 'Notifications', onPress: () => {} }, { glyph: 'person', accessibilityLabel: 'Compte', onPress: () => {} }]} />
          </GlassGroup>
        }
      />

      <FloatingTabBar
        tabs={layout.tabs.map((t) => ({ key: t.route, label: t.label, glyph: t.glyph }))}
        activeKey={layout.tabs[1].route}
        onSelect={() => {}}
        prominent={{ key: 'p', label: layout.prominent.label, glyph: layout.prominent.glyph, onPress: () => {} }}
      />

      <Sheet visible={sheet !== 'none'} detent={sheet === 'large' ? 'large' : 'medium'} title="Comprendre l'outil" onClose={() => setSheet('none')}>
        <ThemedText variant="body" color="label2">Contenu de la feuille.</ThemedText>
      </Sheet>
    </View>
  );
}
