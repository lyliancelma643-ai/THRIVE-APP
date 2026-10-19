import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  Button, Card, Field, GlassButton, GlassSurface, Icon, List, NavBar, Section, SectionFooter, SectionHeader, Segmented, Sheet,
  ThemedText, useNavBarHeight, useScrollEdge, useTheme,
} from '../../design';
import { InfoSheet } from './InfoSheet';
import { PHOTO_MESSAGES, pickPassportPhoto, removePassportPhoto, uploadPassportPhoto } from './passportPhoto';
import { LockedPreview, TrackRow } from './BilanCards';
import { LOCK_NOTES } from './bilanPage';
import { LsssCurve } from './Charts';
import { JerseyDisc, useKidColor } from './Chrome';
import {
  ACCENT_KEYS, ACCENT_LABEL, PASSPORT_PALETTE, lsssDelta, lsssLatestLabel, orderedSkills, skillLabel,
  type AccentKey, type Gauge, type LsssPoint,
} from './bilanData';

// ── H — Compétences de vie : feuille en grand détent ─────────────────────────────

export type LifeSkillsProps = {
  visible: boolean;
  onClose: () => void;
  lsss: LsssPoint[];
  gauge: Gauge | null;
  /** Repère de départ par compétence (première mesure) ; vide = pas de trait ni d'écart. */
  baselines: Record<string, number>;
  onInfo: () => void;
  /** I s'ouvre PAR-DESSUS H : sa feuille est imbriquée dans celle de H (une seule présentation modale à la fois sur iOS). */
  understandVisible?: boolean;
  onCloseUnderstand?: () => void;
  childName?: string | null;
  /** Forfait Groupe : le détail par compétence est un aperçu atténué (« dès le pack Individuel »), sans donnée réelle. */
  skillsLocked?: boolean;
};

const MOMENT_SUBTITLE: Record<string, string> = {
  Départ: 'départ, séance 1',
  'Mi-parcours': 'mi-parcours, séance 7',
  Final: 'bilan final, séance 13',
};

export function LifeSkillsSheet({ visible, onClose, lsss, gauge, baselines, onInfo, understandVisible, onCloseUnderstand, skillsLocked }: LifeSkillsProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'global' | 'skills'>('global');
  const latest = lsss.length ? lsss[lsss.length - 1] : null;
  const total = gauge?.global ?? latest?.value ?? null;
  const delta = lsssDelta(lsss);
  const label = lsssLatestLabel(lsss);
  const skills = skillsLocked ? [] : orderedSkills(gauge?.by_skill ?? {});
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Compétences de vie"
      detent="large"
      contentStyle={{ paddingHorizontal: 0 }}
      trailing={<GlassButton glyph="info" accessibilityLabel="Comprendre cette carte" onPress={onInfo} />}
    >
      <View style={{ paddingHorizontal: 16 }}>
        <Segmented
          options={[{ key: 'global', label: 'Global' }, { key: 'skills', label: 'Par compétence' }]}
          value={tab}
          onChange={setTab}
          accessibilityLabel="Affichage"
        />
      </View>
      {tab === 'global' ? (
        <>
          {total != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 18, paddingHorizontal: 20 }}>
              <ThemedText variant="title1" style={{ fontSize: 56, lineHeight: 60 }}>{total}</ThemedText>
              <View style={{ flex: 1 }}>
                {delta != null ? (
                  <ThemedText variant="headline" style={{ color: colors.ok }}>
                    {delta > 0 ? `+${delta}` : delta} depuis le départ
                  </ThemedText>
                ) : null}
                {label ? <ThemedText variant="sub" color="label2">LSSS · {MOMENT_SUBTITLE[label] ?? label.toLowerCase()}</ThemedText> : null}
              </View>
            </View>
          ) : (
            <ThemedText variant="sub" color="label2" style={{ paddingTop: 18, paddingHorizontal: 20 }}>
              Le repère apparaîtra après le premier questionnaire rempli ensemble.
            </ThemedText>
          )}
          {lsss.length > 0 ? (
            <Section style={{ marginTop: 6 }}>
              <Card padding={0} style={{}}>
                <View style={{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 6 }}>
                  <LsssCurve points={lsss} />
                </View>
              </Card>
            </Section>
          ) : null}
        </>
      ) : null}
      {skillsLocked ? (
        <Section style={{ marginTop: 18 }}>
          <LockedPreview note={LOCK_NOTES.skills} height={210}>
            <View style={{ gap: 14 }}>{[68, 44, 81].map((v, i) => <TrackRow key={i} label="Compétence" value={v} />)}</View>
          </LockedPreview>
        </Section>
      ) : skills.length > 0 ? (
        <>
          <SectionHeader small title={`${skills.length} compétences${Object.keys(baselines).length ? ' · trait = départ' : ''}`} />
          <Section>
            <List>
              {skills.map(([k, v]) => {
                const base = baselines[k];
                const diff = base != null ? Math.round(v - base) : null;
                return (
                  <View key={k} style={{ minHeight: 58, paddingHorizontal: 16, paddingVertical: 11, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText variant="sub">{skillLabel(k)}</ThemedText>
                      <ThemedText variant="sub">
                        <ThemedText variant="sub" weight={700}>{Math.round(v)}</ThemedText>
                        {diff != null && diff !== 0 ? <ThemedText variant="sub" style={{ color: colors.ok }}>{`  ${diff > 0 ? '+' : ''}${diff}`}</ThemedText> : null}
                      </ThemedText>
                    </View>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.fill, marginTop: 7 }}>
                      <View style={{ position: 'absolute', left: 0, top: 0, height: 8, width: `${Math.min(100, Math.max(0, v))}%`, borderRadius: 4, backgroundColor: colors.tint }} />
                      {base != null ? (
                        <View style={{ position: 'absolute', top: -3, left: `${Math.min(100, Math.max(0, base))}%`, marginLeft: -1, width: 2, height: 14, borderRadius: 1, backgroundColor: colors.label2 }} />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </List>
          </Section>
        </>
      ) : (
        <ThemedText variant="sub" color="label2" style={{ paddingTop: 18, paddingHorizontal: 20 }}>
          Le détail par compétence apparaîtra après le premier questionnaire LSSS.
        </ThemedText>
      )}
      <InfoSheet visible={!!understandVisible} onClose={onCloseUnderstand ?? (() => {})} cardKey="competences" />
    </Sheet>
  );
}

// ── J — Personnaliser le passeport (écran plein, ouvert en modale par la route) ───

export type PersonalizeProps = {
  name: string;
  initial: string;
  jersey: string;
  onJersey: (v: string) => void;
  nickname: string;
  onNickname: (v: string) => void;
  accent: AccentKey | null;
  onAccent: (k: AccentKey) => void;
  /** Poste : renseigné par le coach (lecture seule côté parent). */
  position: string | null;
  photoUri?: string | null;
  /**
   * Enfant dont on change la photo : active le choix de photo intégré (photothèque, envoi dans le bucket privé
   * `child-avatars`, comme le web). Sans `childId` ni `onPickPhoto`, bouton et lien sont masqués.
   */
  childId?: string;
  /** Appelé après un envoi ou un retrait réussi (la page relit la fiche). */
  onPhotoChanged?: () => void;
  /** Remplace le choix intégré (galerie DEV, tests). */
  onPickPhoto?: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  /** Numéro invalide (hors 0–999) : OK inactif. */
  invalid?: boolean;
};

export function PersonalizeView(p: PersonalizeProps) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const scroll = useScrollEdge();
  const kid = useKidColor(p.accent);
  const [localPhoto, setLocalPhoto] = useState<string | null | undefined>(undefined); // undefined = rien changé ici
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const shownPhoto = localPhoto === undefined ? p.photoUri ?? null : localPhoto;
  const { childId, onPhotoChanged } = p;

  // Geste « Changer la photo » : l'accès aux photos n'est demandé qu'ici ; un refus ou une erreur donne une phrase, jamais un plantage.
  const pickPhoto = childId
    ? async () => {
        if (photoBusy) return;
        setPhotoNote(null);
        setPhotoBusy(true);
        try {
          const r = await pickPassportPhoto();
          if (r.status === 'denied') setPhotoNote(PHOTO_MESSAGES.denied);
          else if (r.status === 'error') setPhotoNote(PHOTO_MESSAGES.read);
          else if (r.status === 'ok') {
            const up = await uploadPassportPhoto(childId, r.photo);
            if (up.ok) {
              setLocalPhoto(r.photo.uri);
              onPhotoChanged?.();
            } else setPhotoNote(PHOTO_MESSAGES[up.failure]);
          }
        } finally {
          setPhotoBusy(false);
        }
      }
    : undefined;
  const removePhoto = childId
    ? async () => {
        if (photoBusy) return;
        setPhotoNote(null);
        setPhotoBusy(true);
        try {
          if (await removePassportPhoto(childId)) {
            setLocalPhoto(null);
            onPhotoChanged?.();
          } else setPhotoNote(PHOTO_MESSAGES.save);
        } finally {
          setPhotoBusy(false);
        }
      }
    : undefined;
  const onPick = p.onPickPhoto ?? pickPhoto;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID="passeport-perso">
      <ScrollView
        onScroll={scroll.onScroll}
        scrollEventThrottle={scroll.scrollEventThrottle}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: navH + 8, paddingBottom: 40 }}
      >
        <View style={{ alignItems: 'center' }}>
          <View>
            <JerseyDisc size={118} bg={kid.bg} ink={kid.ink} label={p.jersey.trim() || p.initial} photoUri={shownPhoto} accessibilityLabel={`Passeport de ${p.name}`} />
            {onPick ? (
              <Pressable
                onPress={onPick}
                disabled={photoBusy}
                accessibilityRole="button"
                accessibilityLabel="Choisir une photo"
                style={{ position: 'absolute', right: -4, bottom: -2 }}
              >
                <GlassSurface interactive radius={22}>
                  <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="camera" size={21} color={colors.label} />
                  </View>
                </GlassSurface>
              </Pressable>
            ) : null}
          </View>
          {onPick ? (
            <Pressable onPress={onPick} disabled={photoBusy} accessibilityRole="button" accessibilityState={{ busy: photoBusy }} style={{ marginTop: 12 }}>
              <ThemedText variant="sub" color="tintText">{shownPhoto ? 'Changer la photo' : 'Choisir une photo'}</ThemedText>
            </Pressable>
          ) : null}
          {removePhoto && shownPhoto ? (
            <Pressable onPress={removePhoto} disabled={photoBusy} accessibilityRole="button" style={{ marginTop: 6 }}>
              <ThemedText variant="foot" color="label2">Retirer la photo</ThemedText>
            </Pressable>
          ) : null}
          {photoNote ? (
            <ThemedText variant="foot" color="label2" accessibilityRole="alert" style={{ marginTop: 8, paddingHorizontal: 24, textAlign: 'center' }}>{photoNote}</ThemedText>
          ) : null}
        </View>

        <SectionHeader small title="Identité" />
        <Section>
          <List>
            <Field label="Surnom d’athlète" value={p.nickname} onChangeText={(t) => p.onNickname(t.slice(0, 30))} placeholder="Facultatif" accessibilityLabel="Surnom d’athlète" maxLength={30} />
            <Field label="N° maillot" value={p.jersey} onChangeText={(t) => p.onJersey(t.replace(/\D/g, '').slice(0, 3))} placeholder="Facultatif" keyboardType="number-pad" accessibilityLabel="Numéro de maillot" />
            <Field label="Poste">
              <ThemedText variant="body" color={p.position ? 'label' : 'label2'}>{p.position ?? 'Renseigné par le coach'}</ThemedText>
            </Field>
          </List>
        </Section>

        <SectionHeader small title="Couleur du passeport" />
        <Section>
          <List>
            <View style={{ paddingVertical: 16, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              {ACCENT_KEYS.map((k) => {
                const on = p.accent === k;
                const hex = PASSPORT_PALETTE[k];
                return (
                  <Pressable
                    key={k}
                    onPress={() => p.onAccent(k)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Couleur ${ACCENT_LABEL[k]}`}
                    style={{ width: 52, alignItems: 'center', gap: 4 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: hex }}>
                      {on ? <View style={{ position: 'absolute', top: -5.5, left: -5.5, width: 55, height: 55, borderRadius: 27.5, borderWidth: 2.5, borderColor: hex }} /> : null}
                    </View>
                    <ThemedText variant="cap" weight={on ? 700 : 400} color={on ? 'label' : 'label2'}>{ACCENT_LABEL[k]}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </List>
          <SectionFooter>{`${p.name} verra sa couleur partout dans son passeport.`}</SectionFooter>
        </Section>

        <Section style={{ marginTop: 22 }}>
          <Button label="Enregistrer" variant="accent" onPress={p.onSave} disabled={p.saving || p.invalid} loading={p.saving} testID="passeport-enregistrer" />
          <ThemedText variant="cap" color="label2" style={{ textAlign: 'center', marginTop: 12 }}>
            La photo reste privée : visible uniquement par la famille, le coach et l’équipe THRIVE.
          </ThemedText>
        </Section>
      </ScrollView>
      <NavBar
        edge
        title="Personnaliser le passeport"
        left={<GlassButton label="Annuler" accessibilityLabel="Annuler" onPress={p.onCancel} />}
      />
    </View>
  );
}
