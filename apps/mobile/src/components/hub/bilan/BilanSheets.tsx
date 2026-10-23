// Les fenêtres du Bilan, portages fidèles du web (bilans/detail-modal.tsx, card-info.tsx, passport-edit.tsx),
// présentées en feuilles iOS (WebSheet : ressort, poignée, glisser pour fermer).

import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tap, WIcon, WText, useWeb, type WIconName } from '../../../design/web';
import { CARD_INFO, type CardInfo } from '../../bilan/cardInfo';
import { PHOTO_MESSAGES, pickPassportPhoto, removePassportPhoto, uploadPassportPhoto, type PickedPhoto } from '../../bilan/passportPhoto';
import { supabaseClient as supabase } from '@thrive/shared';
import { WebSheet } from '../WebSheet';
import { accentHex } from './data';

export const DETAIL_KEYS = ['boite', 'etapes', 'identite', 'objectif', 'focus', 'routine', 'lettre', 'certificat'] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];
export function isDetailKey(k: string): k is DetailKey {
  return (DETAIL_KEYS as readonly string[]).includes(k);
}

export type DetailData = {
  firstName: string;
  accent: string;
  toolbox: { tool: string; context: string }[];
  focusWord: string | null;
  nextSteps: { label: string; status: string; due_date: string | null }[];
  sportStory: string | null;
  strengths: string[];
  seasonDream: string | null;
  sport: string;
  poste: string;
  club: string | null;
  smartGoal: string | null;
  lifeSkillGoal: string | null;
  myActions: string[];
  pct: number;
  letter: string | null;
  completed: number;
  certificateReady: boolean;
  docIds: { contract?: string; letter?: string; certificate?: string };
};

const TITLES: Record<DetailKey, { icon: WIconName; title: string; session: string }> = {
  boite: { icon: 'target', title: 'Boîte à outils', session: 'Construite au fil des séances' },
  etapes: { icon: 'clipboard', title: 'Prochaines étapes', session: 'Définies avec le coach' },
  identite: { icon: 'user', title: 'Fiche Identité Athlète', session: 'Séance S1' },
  objectif: { icon: 'target', title: 'Fiche Objectif THRIVE', session: 'Séance S2' },
  focus: { icon: 'sparkle', title: 'Focus Word', session: 'Séance S9' },
  routine: { icon: 'timer', title: 'Routine pré-tir', session: 'Séance S6' },
  lettre: { icon: 'mail', title: 'Lettre à moi-même dans 1 an', session: 'Séance S13' },
  certificat: { icon: 'trophy', title: 'Certificat THRIVE', session: 'Fin de parcours' },
};

/** Hex + opacité (le `${accent}14` du web). */
const alpha = (hex: string, a: number) => `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;

/** Couleur de l'enfant en texte : lisible en Jour (mêlée au marine, comme `color-mix … --kid-mix`). */
function useAccentText(accent: string) {
  const w = useWeb();
  return w.isNight ? accent : '#022539';
}

function Label({ children, color }: { children: string; color?: string }) {
  return (
    <WText size={11} weight={600} tracking={0.05} upper tone="faint" color={color} style={{ marginBottom: 8 }}>
      {children}
    </WText>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <WText size={15} tone="faint">
      {children}
    </WText>
  );
}

function Bar({ pct, accent, height = 10 }: { pct: number; accent: string; height?: number }) {
  const w = useWeb();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: w.line, overflow: 'hidden' }}>
      <LinearGradient colors={['#A7C4BC', accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct}%`, height: '100%', borderRadius: height / 2 }} />
    </View>
  );
}

function Body({ k, d }: { k: DetailKey; d: DetailData }) {
  const w = useWeb();
  const accent = d.accent;
  const accentText = useAccentText(accent);

  if (k === 'boite') {
    return (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
          <WText display size={44} weight={600} lh={44} tone="ink">
            {String(d.toolbox.length)}
          </WText>
          <WText size={15} tone="faint">
            /6 outils collectés
          </WText>
        </View>
        {d.toolbox.length ? (
          <View style={{ gap: 12 }}>
            {d.toolbox.map((t, i) => (
              <View key={i} style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 15, backgroundColor: 'rgba(167,196,188,0.07)', borderWidth: 1, borderColor: 'rgba(167,196,188,0.18)' }}>
                <WText size={17} weight={600} tone="body">
                  {t.tool}
                </WText>
                {t.context ? (
                  <WText size={14} tone="soft" style={{ marginTop: 4 }}>
                    {t.context}
                  </WText>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Empty>Les outils apparaîtront ici au fil des séances.</Empty>
        )}
        {d.focusWord ? (
          <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 15, backgroundColor: alpha(accent, 0.08), borderWidth: 1, borderColor: alpha(accent, 0.2) }}>
            <WText size={12} tone="soft">
              Focus word
            </WText>
            <WText display size={22} weight={600} color={accentText} style={{ marginLeft: 'auto' }}>
              {d.focusWord}
            </WText>
          </View>
        ) : null}
      </>
    );
  }

  if (k === 'etapes') {
    return d.nextSteps.length ? (
      <View style={{ gap: 12 }}>
        {d.nextSteps.map((s, i) => {
          const done = s.status === 'done';
          const icon: WIconName = done ? 'check' : s.status === 'doing' ? 'timer' : 'clipboard';
          return (
            <View
              key={i}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 15,
                backgroundColor: done ? 'rgba(167,196,188,0.09)' : w.surfaceSub, borderWidth: 1, borderColor: done ? 'rgba(167,196,188,0.2)' : w.line,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: w.chip, alignItems: 'center', justifyContent: 'center' }}>
                <WIcon name={icon} size={18} color={done ? w.sageInk : accentText} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <WText size={16} weight={600} lh={1.4} tone="body">
                  {s.label}
                </WText>
                <WText size={12.5} tone="faint" style={{ marginTop: 2 }}>
                  {`${done ? 'Terminé' : s.status === 'doing' ? 'En cours' : 'À venir'}${
                    s.due_date ? ` · ${new Date(s.due_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}` : ''
                  }`}
                </WText>
              </View>
            </View>
          );
        })}
      </View>
    ) : (
      <Empty>Le coach précisera bientôt les prochaines étapes.</Empty>
    );
  }

  if (k === 'identite') {
    return (
      <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
          {[
            ['Sport', d.sport],
            ['Poste', d.poste],
            ['Club', d.club || '—'],
          ].map(([l, v]) => (
            <View key={l} style={{ flexGrow: 1, minWidth: 130, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: w.line, borderWidth: 1, borderColor: w.line }}>
              <WText size={11} weight={600} tracking={0.05} upper tone="faint" style={{ marginBottom: 3 }}>
                {l}
              </WText>
              <WText size={16} weight={600} tone="ink">
                {v}
              </WText>
            </View>
          ))}
        </View>
        <Section label="Histoire sportive">
          {d.sportStory ? (
            <WText size={16} lh={1.65} tone="body">
              {d.sportStory}
            </WText>
          ) : (
            <Empty>À renseigner avec le coach.</Empty>
          )}
        </Section>
        <Section label="Forces (VIA)">
          {d.strengths.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {d.strengths.map((s) => (
                <View key={s} style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 12, backgroundColor: 'rgba(167,196,188,0.14)', borderWidth: 1, borderColor: 'rgba(167,196,188,0.25)' }}>
                  <WText size={15} weight={600} tone="sage">
                    {s}
                  </WText>
                </View>
              ))}
            </View>
          ) : (
            <Empty>Forces à identifier ensemble.</Empty>
          )}
        </Section>
        {d.seasonDream ? (
          <View style={{ paddingVertical: 18, paddingRight: 20, paddingLeft: 44, borderRadius: 16, backgroundColor: alpha(accent, 0.06), borderWidth: 1, borderColor: alpha(accent, 0.16) }}>
            <WText display size={36} lh={36} color={alpha(accent, 0.45)} style={{ position: 'absolute', left: 14, top: 6 }}>
              “
            </WText>
            <Label color={accentText}>Rêve de saison</Label>
            <WText display italic size={19} lh={1.45} tone="body" style={{ marginTop: -4 }}>
              {d.seasonDream}
            </WText>
          </View>
        ) : null}
      </>
    );
  }

  if (k === 'objectif') {
    return (
      <>
        <View style={{ paddingVertical: 20, paddingRight: 22, paddingLeft: 46, borderRadius: 16, marginBottom: 22, backgroundColor: 'rgba(167,196,188,0.07)', borderWidth: 1, borderColor: 'rgba(167,196,188,0.18)' }}>
          <WText display size={38} lh={38} color={alpha(accent, 0.45)} style={{ position: 'absolute', left: 15, top: 8 }}>
            “
          </WText>
          <WText size={11} weight={600} tracking={0.05} upper tone="faint" style={{ marginBottom: 5 }}>
            Objectif SMART
          </WText>
          <WText display size={21} weight={500} lh={1.4} tone="body">
            {d.smartGoal || 'Objectif SMART à co-construire avec le coach.'}
          </WText>
        </View>
        {d.lifeSkillGoal ? (
          <Section label="Objectif life skill">
            <WText size={16} lh={1.55} tone="body">
              {d.lifeSkillGoal}
            </WText>
          </Section>
        ) : null}
        {d.myActions.length > 0 ? (
          <Section label="Ce qui dépend de moi">
            <View style={{ gap: 10 }}>
              {d.myActions.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 11 }}>
                  <WIcon name="check" size={15} color={accentText} />
                  <WText size={16} weight={500} lh={1.5} tone="body" style={{ flex: 1 }}>
                    {a}
                  </WText>
                </View>
              ))}
            </View>
          </Section>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <WText size={13} tone="soft">
            Progression du parcours
          </WText>
          <WText display size={17} weight={600} color={accentText}>{`${d.pct}%`}</WText>
        </View>
        <Bar pct={d.pct} accent={accent} />
      </>
    );
  }

  if (k === 'focus') {
    return (
      <View style={{ alignItems: 'center', paddingTop: 26, paddingBottom: 10 }}>
        {d.focusWord ? (
          <>
            <WText
              display
              size={54}
              weight={600}
              lh={1.1}
              tracking={0.04}
              center
              color={w.isNight ? '#FFF7C8' : '#022539'}
              style={{ textShadowColor: alpha(accent, 0.6), textShadowRadius: 34, textShadowOffset: { width: 0, height: 0 } }}
            >
              {d.focusWord}
            </WText>
            <WText size={11} weight={600} tracking={0.05} upper tone="faint" style={{ marginTop: 16 }}>{`Mot-ancre actif de ${d.firstName}`}</WText>
            <WText size={14.5} lh={1.6} tone="soft" center style={{ marginTop: 18, maxWidth: 380 }}>
              Choisi à la séance S9, ce mot ramène l’attention au bon endroit dans les moments importants — avant un match, un examen, un moment de pression.
            </WText>
          </>
        ) : (
          <Empty>Le mot-ancre sera choisi à la séance S9.</Empty>
        )}
      </View>
    );
  }

  if (k === 'routine') {
    const steps: [string, string][] = [
      ['1', 'Respire · 3 cycles lents'],
      ['2', 'Visualise le geste parfait'],
      ['3', d.focusWord ? `Mot-ancre · « ${d.focusWord} »` : 'Mot-ancre'],
      ['4', 'Action — j’y vais'],
    ];
    return (
      <View style={{ paddingLeft: 6 }}>
        <View style={{ gap: 18 }}>
        <LinearGradient
          colors={[accent, '#A7C4BC', 'rgba(167,196,188,0.3)']}
          locations={[0, 0.6, 1]}
          style={{ position: 'absolute', left: 18, top: 14, bottom: 14, width: 2 }}
        />
        {steps.map(([n, txt], i) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                backgroundColor: i === 0 ? accent : i === 3 ? 'rgba(255,255,255,0.06)' : '#A7C4BC',
                borderWidth: i === 3 ? 1 : 0, borderColor: w.line2,
              }}
            >
              <WText display size={15} weight={600} color={i === 3 ? w.text2 : '#06222A'} lh={18}>
                {n}
              </WText>
            </View>
            <WText size={17} weight={i === 3 ? 700 : 500} tone="body" style={{ flex: 1 }}>
              {txt}
            </WText>
          </View>
        ))}
        </View>
        <WText size={13.5} lh={1.55} tone="soft" style={{ marginTop: 26 }}>
          Travaillée à la séance S6, cette routine se répète à l’identique avant chaque geste important pour installer calme et constance.
        </WText>
      </View>
    );
  }

  if (k === 'lettre') {
    return d.letter ? (
      <View style={{ borderRadius: 16, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 24, backgroundColor: w.chip, borderWidth: 1, borderColor: w.line }}>
        <WText display italic size={15} tone="soft" style={{ marginBottom: 14 }}>{`Chère ${d.firstName},`}</WText>
        <WText display italic size={17} lh={1.7} tone="body">
          {d.letter}
        </WText>
      </View>
    ) : (
      <Empty>La lettre sera écrite lors de la séance bilan (S13), puis scellée ici pendant un an.</Empty>
    );
  }

  const remaining = Math.max(13 - d.completed, 0);
  return (
    <>
      <WText size={15.5} lh={1.6} tone="soft" style={{ marginBottom: 20 }}>
        {`Reconnaissance officielle de fin de parcours de ${d.firstName} — débloquée à la dernière séance.`}
      </WText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <WText size={14} tone="soft">{`${d.completed}/13 séances`}</WText>
        <WText display size={16} weight={600} tone="soft">
          {remaining ? `${remaining} restantes` : 'Parcours complété 🎉'}
        </WText>
      </View>
      <Bar pct={Math.round((Math.min(d.completed, 13) / 13) * 100)} accent={accent} height={11} />
    </>
  );
}

/** Fiche détaillée d'une carte « livrable » ; la flèche ouvre l'explication par-dessus. */
export function DetailSheet({
  detailKey, d, onClose, onExplain, onOpenDoc,
}: { detailKey: DetailKey | null; d: DetailData; onClose: () => void; onExplain: () => void; onOpenDoc: (docId: string) => void }) {
  const accentText = useAccentText(d.accent);
  const k = detailKey ?? 'boite';
  const meta = TITLES[k];
  const docId = k === 'lettre' ? d.docIds.letter : k === 'certificat' && d.certificateReady ? d.docIds.certificate : undefined;
  return (
    <WebSheet visible={detailKey !== null} onClose={onClose} accessibilityLabel={meta.title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4, paddingRight: 56, marginTop: 4 }}>
        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: alpha(d.accent, 0.09), borderWidth: 1, borderColor: alpha(d.accent, 0.24), alignItems: 'center', justifyContent: 'center' }}>
          <WIcon name={meta.icon} size={20} color={accentText} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <WText display size={22} weight={600} lh={1.15} tone="ink" accessibilityRole="header">
            {meta.title}
          </WText>
          <WText size={12} tone="faint" style={{ marginTop: 3 }}>{`${d.firstName} · ${meta.session}`}</WText>
        </View>
      </View>
      <View style={{ paddingTop: 20, paddingBottom: 6 }}>
        <Body k={k} d={d} />
      </View>
      {docId ? (
        <Tap
          onPress={() => onOpenDoc(docId)}
          accessibilityRole="button"
          accessibilityLabel="Télécharger le PDF"
          style={{ minHeight: 48, marginTop: 16, borderRadius: 13, borderWidth: 1, borderColor: alpha(d.accent, 0.3), backgroundColor: alpha(d.accent, 0.12), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <WIcon name="download" size={18} color={accentText} />
          <WText size={14} weight={700} color={accentText}>
            Télécharger le PDF
          </WText>
        </Tap>
      ) : null}
      <View style={{ alignItems: 'flex-end', marginTop: 18 }}>
        <Tap
          onPress={onExplain}
          accessibilityRole="button"
          accessibilityLabel="Comprendre cette carte"
          style={{
            width: 52, height: 52, borderRadius: 26, backgroundColor: d.accent, alignItems: 'center', justifyContent: 'center',
            shadowColor: d.accent, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 10 },
          }}
        >
          <WIcon name="arrow-right" size={22} color="#06222A" />
        </Tap>
      </View>
    </WebSheet>
  );
}

/** « Comprendre cette carte » : la fiche d'explication (InfoModal du web, mêmes textes). */
export function InfoSheet({ infoKey, onClose }: { infoKey: string | null; onClose: () => void }) {
  const w = useWeb();
  const info: CardInfo | undefined = infoKey ? CARD_INFO[infoKey] : undefined;
  return (
    <WebSheet visible={!!info} onClose={onClose} accessibilityLabel={info?.title}>
      {info ? (
        <View style={{ marginTop: 4 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ paddingVertical: 5, paddingHorizontal: 11, borderRadius: 9, backgroundColor: 'rgba(249,235,80,0.12)', borderWidth: 1, borderColor: 'rgba(249,235,80,0.28)' }}>
              <WText size={11} weight={600} tone="accent" lh={14}>
                {info.badge}
              </WText>
            </View>
          </View>
          <WText display size={26} weight={600} lh={1.1} tone="ink" style={{ marginBottom: 6, paddingRight: 48 }} accessibilityRole="header">
            {info.title}
          </WText>
          <WText size={13.5} lh={1.5} tone="soft" style={{ marginBottom: 18 }}>
            {info.tagline}
          </WText>
          {info.sections.map((s) => (
            <View key={s.label} style={{ marginBottom: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: w.surfaceSub, borderWidth: 1, borderColor: w.line }}>
              <WText size={10.5} weight={600} tracking={0.06} upper tone="sage" style={{ marginBottom: 7 }}>
                {s.label}
              </WText>
              {s.text ? (
                <WText size={13.5} lh={1.6} tone="body">
                  {s.text}
                </WText>
              ) : null}
              {s.bullets ? (
                <View style={{ gap: 7, marginTop: s.text ? 8 : 0 }}>
                  {s.bullets.map((b) => (
                    <View key={b} style={{ flexDirection: 'row', gap: 9 }}>
                      <WText size={11} tone="accent" lh={20}>
                        ✦
                      </WText>
                      <WText size={13} lh={1.55} tone="body" style={{ flex: 1 }}>
                        {b}
                      </WText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {info.tip ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 13, paddingHorizontal: 15, borderRadius: 14, backgroundColor: 'rgba(249,235,80,0.08)', borderWidth: 1, borderColor: 'rgba(249,235,80,0.22)', marginTop: 4 }}>
              <WIcon name="home" size={16} color={w.accentInk} />
              <View style={{ flex: 1 }}>
                <WText size={10.5} weight={600} tracking={0.06} upper tone="accent" style={{ marginBottom: 4 }}>
                  À la maison
                </WText>
                <WText size={13} lh={1.55} tone="body">
                  {info.tip}
                </WText>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </WebSheet>
  );
}

const ACCENT_PRESETS: { key: string; hex: string; label: string }[] = [
  { key: 'sun', hex: '#F9EB50', label: 'Soleil' },
  { key: 'amber', hex: '#F6B45A', label: 'Ambre' },
  { key: 'teal', hex: '#A7C4BC', label: 'Sauge' },
  { key: 'sky', hex: '#6EC1E4', label: 'Ciel' },
  { key: 'coral', hex: '#F58A7E', label: 'Corail' },
  { key: 'violet', hex: '#B79CE4', label: 'Violet' },
];

export type PassportChild = { id: string; first_name: string; last_name: string | null; nickname: string | null; jersey_number: number | null; accent_color: string | null };

/** « Personnaliser le passeport » : photo, surnom, numéro, couleur — enregistré d'un coup avec « Enregistrer », comme le web. */
export function PassportSheet({
  visible, child, currentAvatarUrl, onClose, onSaved,
}: { visible: boolean; child: PassportChild; currentAvatarUrl: string | null; onClose: () => void; onSaved: () => void }) {
  const w = useWeb();
  const [nickname, setNickname] = useState(child.nickname ?? '');
  const [jersey, setJersey] = useState(child.jersey_number?.toString() ?? '');
  const [accent, setAccent] = useState(child.accent_color ?? 'sun');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNickname(child.nickname ?? '');
    setJersey(child.jersey_number?.toString() ?? '');
    setAccent(child.accent_color ?? 'sun');
    setPhoto(null);
    setRemovePhoto(false);
    setError('');
  }, [visible, child]);

  const shown = removePhoto ? null : photo?.uri ?? currentAvatarUrl;
  const hex = accentHex(accent);
  const initials = `${child.first_name?.[0] ?? ''}${child.last_name?.[0] ?? ''}`.toUpperCase() || '★';
  const num = jersey.trim() ? Math.max(0, Math.min(999, parseInt(jersey, 10) || 0)) : null;

  const pick = async () => {
    const r = await pickPassportPhoto();
    if (r.status === 'ok') {
      setPhoto(r.photo);
      setRemovePhoto(false);
    } else if (r.status === 'denied') setError(PHOTO_MESSAGES.denied);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const { error: e } = await supabase
      .from('children')
      .update({ nickname: nickname.trim() ? nickname.trim().slice(0, 30) : null, jersey_number: num, accent_color: accent } as never)
      .eq('id', child.id);
    if (e) {
      setSaving(false);
      setError('Le passeport n’a pas pu être enregistré. Réessaie dans un instant.');
      return;
    }
    if (photo && !removePhoto) {
      const up = await uploadPassportPhoto(child.id, photo);
      if (!up.ok) {
        setSaving(false);
        setError(PHOTO_MESSAGES[up.failure]);
        return;
      }
    } else if (removePhoto) {
      await removePassportPhoto(child.id);
    }
    setSaving(false);
    onSaved();
  };

  const input = { minHeight: 48, paddingHorizontal: 14, borderRadius: 13, backgroundColor: w.surfaceSub, borderWidth: 1, borderColor: w.line2, color: w.text2, fontSize: 16 } as const;

  return (
    <WebSheet visible={visible} onClose={onClose} accessibilityLabel="Personnaliser le passeport">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 20, paddingRight: 56, marginTop: 4 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: alpha(hex, 0.1), borderWidth: 1, borderColor: alpha(hex, 0.25), alignItems: 'center', justifyContent: 'center' }}>
          <WText size={17} tone="ink">
            ✎
          </WText>
        </View>
        <WText display size={21} weight={600} tone="ink" accessibilityRole="header">
          Personnaliser le passeport
        </WText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 }}>
        <View>
          {shown ? (
            <Image source={{ uri: shown }} style={{ width: 76, height: 76, borderRadius: 20, borderWidth: 2.5, borderColor: alpha(hex, 0.4) }} />
          ) : (
            <LinearGradient colors={['#0E6593', '#00314C']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ width: 76, height: 76, borderRadius: 20, borderWidth: 2.5, borderColor: alpha(hex, 0.4), alignItems: 'center', justifyContent: 'center' }}>
              <WText display size={25} weight={600} color="#FFFFFF">
                {initials}
              </WText>
            </LinearGradient>
          )}
          {num !== null ? (
            <View style={{ position: 'absolute', right: -8, bottom: -8, minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 9, backgroundColor: hex, alignItems: 'center', justifyContent: 'center' }}>
              <WText size={12} weight={800} color="#06222A" lh={15}>
                {String(num)}
              </WText>
            </View>
          ) : null}
        </View>
        <View style={{ gap: 8, flex: 1 }}>
          <Tap onPress={pick} accessibilityRole="button" style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: w.chip, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <WText size={13} weight={600} tone="body">{`📷 ${shown ? 'Changer la photo' : 'Ajouter une photo'}`}</WText>
          </Tap>
          {shown ? (
            <Pressable
              onPress={() => {
                setPhoto(null);
                setRemovePhoto(true);
              }}
              accessibilityRole="button"
              style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', alignSelf: 'flex-start' }}
            >
              <WText size={12} weight={500} tone="soft">
                Retirer la photo
              </WText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
        <View style={{ flex: 1 }}>
          <WText size={11} weight={600} tracking={0.05} upper tone="faint" style={{ marginBottom: 7 }}>
            Surnom d’athlète
          </WText>
          <TextInput value={nickname} onChangeText={setNickname} maxLength={30} placeholder="ex. La Fusée" placeholderTextColor={w.text4} style={input} accessibilityLabel="Surnom d’athlète" />
        </View>
        <View style={{ width: 108 }}>
          <WText size={11} weight={600} tracking={0.05} upper tone="faint" style={{ marginBottom: 7 }}>
            N° maillot
          </WText>
          <TextInput
            value={jersey}
            onChangeText={(t) => setJersey(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="—"
            placeholderTextColor={w.text4}
            style={input}
            accessibilityLabel="Numéro de maillot"
          />
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <WText size={11} weight={600} tracking={0.05} upper tone="faint" style={{ marginBottom: 7 }}>
          Couleur du passeport
        </WText>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {ACCENT_PRESETS.map((p) => (
            <Tap
              key={p.key}
              onPress={() => setAccent(p.key)}
              accessibilityRole="radio"
              accessibilityLabel={p.label}
              accessibilityState={{ selected: accent === p.key }}
              style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: p.hex, borderWidth: 3, borderColor: accent === p.key ? '#FFFFFF' : 'transparent' }}
            >
              <View />
            </Tap>
          ))}
        </View>
      </View>

      {error ? (
        <View style={{ marginBottom: 14, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 12, backgroundColor: 'rgba(220,80,80,0.15)' }}>
          <WText size={13} color={w.isNight ? '#FFB4B4' : '#B42318'}>
            {error}
          </WText>
        </View>
      ) : null}

      <Tap
        onPress={save}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Enregistrer"
        style={{ minHeight: 52, borderRadius: 15, backgroundColor: saving ? w.chip : hex, alignItems: 'center', justifyContent: 'center' }}
      >
        <WText size={15} weight={700} color={saving ? w.text4 : '#06222A'}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </WText>
      </Tap>
      <WText size={11} tone="faint" center style={{ marginTop: 12 }}>
        La photo reste privée : visible uniquement par la famille, le coach et l’équipe THRIVE.
      </WText>
    </WebSheet>
  );
}
