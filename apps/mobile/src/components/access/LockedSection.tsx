import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CANVAS, Card, GlassButton, GlassGroup, GlassSurface, Icon, Kicker, LargeTitle, List, ListRow, LockOverlay,
  MascotMedallion, MutedPreview, NavBar, RADIUS, ThemedText, VignetteImage, useNavBarHeight, useTheme,
} from '../../design';
import { Ring } from '../bilan/Ring';
import { Sparkline } from '../bilan/Charts';
import { Bubble } from '../bilan/Bubble';
import { ChildPill } from '../bilan/Chrome';
import { OFFRES_PROGRAMMES_IN_APP } from '../../lib/offresFlags';

// Onglet Bilan / Mes séances / Messages verrouillé (abonné Maison seul, aucun droit, fermeture
// Super Admin) : écran V2-G / V2-S / V2-U du canevas — aperçu FLOU et FACTICE + carte « s'ouvre avec
// un coach ». Aucune donnée réelle n'est chargée (la RLS les refuse de toute façon, migration 080).
//
// Anti-steering Apple 3.1.1 / Google Play (GO 3 §1 règle 3) : AUCUN lien de paiement, AUCUN prix,
// AUCUNE mention du web. Les boutons mènent à des écrans INTERNES (offres de l'app, messagerie).
// Ce qui touche aux programmes (appel, texte « Groupe, Individuel, Complet ») n'apparaît que si le
// drapeau programmes est vrai. L'état d'accès vient d'access_state(), jamais recalculé ici.

export type LockedKind = 'bilan' | 'seances' | 'messages';

type Copy = { title: string; body: string; note?: string; guarantee: boolean };

function copyFor(kind: LockedKind, childName: string | null): Copy {
  if (kind === 'bilan') {
    return {
      title: 'Le Bilan s’ouvre avec un coach',
      body: `Ton coach y construit le passeport de ${childName ?? 'ton enfant'} : ses forces, ses objectifs, ses jauges, et un bilan après chaque séance.`,
      guarantee: true,
    };
  }
  if (kind === 'seances') {
    return {
      title: '13 séances avec un coach',
      body: 'Une séance par semaine, 60 à 70 minutes, seul avec un coach ou en petit groupe. Elles s’afficheront ici, avec leur bilan.',
      guarantee: true,
    };
  }
  return {
    title: 'Écrire à un coach',
    body: OFFRES_PROGRAMMES_IN_APP
      ? 'La messagerie est incluse dans les programmes Groupe, Individuel et Complet.'
      : 'La messagerie avec un coach s’ouvre avec son suivi.',
    note: 'Ceci est un aperçu : aucun message réel n’est affiché.',
    guarantee: false,
  };
}

/** `.btn.md` en demi-largeur : 44 pt, capsule ; le libellé « Appel de 15 min » tient sur une ligne (padding réduit). */
function CardButton({ label, prom, onPress }: { label: string; prom?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center',
        backgroundColor: prom ? colors.tint : colors.fill2, opacity: pressed ? 0.8 : 1,
        ...(prom ? { borderWidth: 1, borderColor: CANVAS.promEdge, borderTopColor: CANVAS.promSpec } : null),
      })}
    >
      <ThemedText variant="headline" numberOfLines={1} style={{ color: prom ? colors.tintInk : colors.tintText }}>{label}</ThemedText>
    </Pressable>
  );
}

export type LockedCardProps = {
  kind: LockedKind;
  childName?: string | null;
  onOffers: () => void;
  onWrite?: () => void;
  onCall?: () => void;
};

/** Carte flottante en verre `.sheet.float.glassy` : médaillon, kicker cadenas, titre, texte, garantie, deux boutons. */
export function LockedCard({ kind, childName = null, onOffers, onWrite, onCall }: LockedCardProps) {
  const { colors } = useTheme();
  const c = copyFor(kind, childName);
  const showCall = OFFRES_PROGRAMMES_IN_APP && !!onCall;
  return (
    <View style={{ marginHorizontal: 8, marginBottom: 14 }} testID={`locked-card-${kind}`}>
      <GlassSurface strong heavy radius={RADIUS.sheetFloat}>
        <View style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {kind === 'messages' ? (
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chat" size={24} color={colors.tintInk} />
              </View>
            ) : (
              <MascotMedallion size={76} halo={false} />
            )}
            <View style={{ flex: 1 }}>
              {kind === 'messages' ? null : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="lock" size={13} color={colors.label2} />
                  <ThemedText variant="foot" color="label2">Avec un programme THRIVE</ThemedText>
                </View>
              )}
              <ThemedText variant="title3" accessibilityRole="header" style={{ marginTop: kind === 'messages' ? 0 : 2 }}>{c.title}</ThemedText>
              {kind === 'messages' ? <ThemedText variant="sub" color="label2">{c.body}</ThemedText> : null}
            </View>
          </View>
          {kind === 'messages' ? (
            <ThemedText variant="foot" color="label2" style={{ marginTop: 12 }}>{c.note}</ThemedText>
          ) : (
            <ThemedText variant="sub" color="label2" style={{ marginTop: 10 }}>{c.body}</ThemedText>
          )}
          {c.guarantee ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <Icon name="shieldCheck" size={16} color={colors.ok} />
              <ThemedText variant="foot" style={{ color: colors.ok, flex: 1 }}>
                Les 2 premières séances ne sont pas facturées si tu n’es pas convaincu.
              </ThemedText>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <CardButton label="Voir les offres" onPress={onOffers} />
            {showCall ? (
              <CardButton prom label="Appel de 15 min" onPress={onCall!} />
            ) : onWrite ? (
              <CardButton prom label="Écrire à mon coach" onPress={onWrite} />
            ) : null}
          </View>
        </View>
      </GlassSurface>
    </View>
  );
}

// ── Aperçus factices (jamais de données réelles) ────────────────────────────────

function BilanPreview() {
  const { colors } = useTheme();
  const bar = (w: number | string, h = 12) => <View style={{ height: h, width: w as number, borderRadius: h / 2, backgroundColor: colors.fill, marginTop: 8 }} />;
  return (
    <MutedPreview>
      {/* Même ossature que la page Bilan ouverte (G) : formes décoratives, jamais de donnée réelle. */}
      <View style={{ marginHorizontal: 20, marginTop: 8 }}>
        <ThemedText variant="eyebrow" color="label2">Programme complété</ThemedText>
        {bar(150, 64)}
        {bar('100%', 8)}
      </View>
      <View style={{ marginHorizontal: 16, marginTop: 22 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.kid }} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline">Passeport d’athlète</ThemedText>
              {bar('55%')}
            </View>
          </View>
        </Card>
      </View>
      <View style={{ marginHorizontal: 16, marginTop: 12, gap: 12 }}>
        <Card>
          <Kicker glyph="sparkles">Compétences de vie</Kicker>
          <View style={{ marginTop: 8 }}><Ring size={78} stroke={9} value={0.67} /></View>
        </Card>
        <Card>
          <Kicker glyph="pulse">Bien-être</Kicker>
          <View style={{ marginTop: 14 }}><Sparkline values={[3.2, 3.5, 3.4, 3.9, 3.8, 4.2, 4.4]} /></View>
        </Card>
        <Card style={{ height: 150 }} />
      </View>
    </MutedPreview>
  );
}

function SeancesPreview() {
  return (
    <MutedPreview>
      <LargeTitle>Mes séances</LargeTitle>
      <View style={{ marginHorizontal: 16, marginTop: 14 }}>
        <List>
          {Array.from({ length: 8 }, (_, i) => (
            <ListRow
              key={i}
              leadingInset={76}
              leading={<VignetteImage id={`ACT-${String(i + 1).padStart(2, '0')}01`} style={{ width: 48, height: 48, borderRadius: 14 }} />}
              title={`${i + 1}. Séance ${i + 1}`}
              subtitle="60 à 70 min avec ton coach"
            />
          ))}
        </List>
      </View>
    </MutedPreview>
  );
}

function MessagesPreview() {
  return (
    <MutedPreview style={{ paddingHorizontal: 16, gap: 8 }}>
      <ThemedText variant="foot" color="label2" style={{ textAlign: 'center', marginTop: 4, marginBottom: 6 }}>Aujourd’hui</ThemedText>
      <Bubble side="in">Message d’exemple</Bubble>
      <Bubble side="out">Message d’exemple</Bubble>
      <Bubble side="in">Message d’exemple</Bubble>
      <Bubble side="out">Message d’exemple</Bubble>
    </MutedPreview>
  );
}

export type LockedScreenProps = LockedCardProps & {
  /** Initiale de l'enfant (pastille de la barre du Bilan). */
  childInitial?: string | null;
  onBell?: () => void;
  onBack?: () => void;
  onCalendar?: () => void;
};

/** Écran verrouillé complet : barre de navigation du canevas + aperçu flouté + carte d'invitation. */
export function LockedScreen({ kind, childName = null, childInitial = null, onBell, onBack, onCalendar, ...card }: LockedScreenProps) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const preview = (
    <View style={{ paddingTop: navH + (kind === 'messages' ? 0 : 4), flex: 1 }}>
      {kind === 'bilan' ? <BilanPreview /> : kind === 'seances' ? <SeancesPreview /> : <MessagesPreview />}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID={`locked-${kind}`}>
      <LockOverlay align="end" preview={<ScrollView scrollEnabled={false} style={{ flex: 1 }}>{preview}</ScrollView>}>
        <LockedCard kind={kind} childName={childName} {...card} />
      </LockOverlay>
      <NavBar
        title={kind === 'messages' ? 'Coach' : undefined}
        left={
          kind === 'bilan' && childName ? (
            <ChildPill name={childName} initial={childInitial ?? childName.charAt(0)} />
          ) : kind === 'messages' && onBack ? (
            <GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />
          ) : null
        }
        right={
          <GlassGroup>
            {kind === 'bilan' && onBell ? <GlassButton glyph="bell" accessibilityLabel="Notifications" onPress={onBell} /> : null}
            {kind === 'seances' && onCalendar ? <GlassButton glyph="calendar" accessibilityLabel="Calendrier" onPress={onCalendar} /> : null}
          </GlassGroup>
        }
      />
    </View>
  );
}

/**
 * Route Bilan / Mes séances / Messages verrouillée : boutons internes uniquement (offres de l'app, appel, messagerie).
 * `messages` (U2) : aperçu factice de la conversation + invitation, sans « Écrire à mon coach » (on y est déjà), sans lien de
 * paiement. L'état d'accès (access_state()) est lu par la route appelante, jamais recalculé ici.
 */
export function LockedSection({ section, childName = null }: { section: LockedKind; childName?: string | null }) {
  const router = useRouter();
  return (
    <LockedScreen
      kind={section}
      childName={childName}
      onOffers={() => router.push('/(parent)/offres')}
      onWrite={section === 'messages' ? undefined : () => router.push('/(parent)/messages')}
      onCall={() => router.push('/(parent)/appel')}
      onBell={section === 'bilan' ? () => router.push('/(parent)/notifications') : undefined}
      onBack={section === 'messages' ? () => (router.canGoBack() ? router.back() : router.replace('/(parent)/maison')) : undefined}
    />
  );
}

/** Pack terminé : historique consultable, rien de nouveau. */
export function ReadOnlyNotice() {
  const { colors, metrics } = useTheme();
  return (
    <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: metrics.rowRadius, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Icon name="lock" size={18} color={colors.label2} />
      <ThemedText variant="sub" color="label2" style={{ flex: 1 }}>
        Votre programme est terminé. L’historique reste consultable ; rien de nouveau ne s’y ajoute.
      </ThemedText>
    </View>
  );
}
