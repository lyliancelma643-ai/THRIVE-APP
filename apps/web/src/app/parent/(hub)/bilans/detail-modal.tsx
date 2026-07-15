'use client';

// Modale « fiche détaillée » : au clic sur une carte du bilan, on montre les
// données réelles de l'enfant en grand format (au lieu d'aller directement à
// l'explication générique). La flèche en bas à droite ouvre la fiche
// d'explication existante (CARD_INFO → InfoModal) par-dessus.
// Rendue via createPortal(document.body) — cf. transform du layout parent.

import { useEffect } from 'react';

export const DETAIL_KEYS = [
  'boite',
  'etapes',
  'identite',
  'objectif',
  'focus',
  'routine',
  'lettre',
  'certificat',
] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];

export function isDetailKey(k: string): k is DetailKey {
  return (DETAIL_KEYS as readonly string[]).includes(k);
}

export type DetailData = {
  firstName: string;
  accent: string; // hex du passeport (personnalisation parent)
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

const TITLES: Record<DetailKey, { icon: string; title: string; session: string }> = {
  boite: { icon: '◎', title: 'Boîte à outils', session: 'Construite au fil des séances' },
  etapes: { icon: '⊟', title: 'Prochaines étapes', session: 'Définies avec le coach' },
  identite: { icon: '◈', title: 'Fiche Identité Athlète', session: 'Séance S1' },
  objectif: { icon: '◎', title: 'Fiche Objectif THRIVE', session: 'Séance S2' },
  focus: { icon: '✦', title: 'Focus Word', session: 'Séance S9' },
  routine: { icon: '◷', title: 'Routine pré-tir', session: 'Séance S6' },
  lettre: { icon: '✉', title: 'Lettre à moi-même dans 1 an', session: 'Séance S13' },
  certificat: { icon: '◈', title: 'Certificat THRIVE', session: 'Fin de parcours' },
};

const LABEL: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  color: 'rgba(234,243,241,.45)',
  marginBottom: 8,
};

const EMPTY: React.CSSProperties = { color: 'rgba(234,243,241,.45)', fontSize: 15 };

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={LABEL}>{label}</div>
      {children}
    </div>
  );
}

function Body({ k, d }: { k: DetailKey; d: DetailData }) {
  const accent = d.accent;

  if (k === 'boite') {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
          <span className="disp" style={{ fontWeight: 700, fontSize: 44, lineHeight: 1 }}>
            {d.toolbox.length}
          </span>
          <span style={{ fontSize: 15, color: 'rgba(234,243,241,.5)' }}>/6 outils collectés</span>
        </div>
        {d.toolbox.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d.toolbox.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 16px', borderRadius: 15,
                  background: 'rgba(167,196,188,.07)', border: '1px solid rgba(167,196,188,.18)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 17, color: '#eaf3f1' }}>{t.tool}</div>
                {t.context && (
                  <div style={{ fontSize: 14, color: 'rgba(234,243,241,.6)', marginTop: 4, lineHeight: 1.5 }}>
                    {t.context}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={EMPTY}>Les outils apparaîtront ici au fil des séances.</p>
        )}
        {d.focusWord && (
          <div
            style={{
              marginTop: 18, display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 15,
              background: `${accent}14`, border: `1px solid ${accent}33`,
            }}
          >
            <span style={{ fontSize: 12, color: 'rgba(234,243,241,.55)' }}>Focus word</span>
            <span className="disp" style={{ marginLeft: 'auto', fontWeight: 600, fontSize: 22, color: accent }}>
              {d.focusWord}
            </span>
          </div>
        )}
      </>
    );
  }

  if (k === 'etapes') {
    return d.nextSteps.length ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {d.nextSteps.map((s, i) => {
          const done = s.status === 'done';
          const icon = done ? '✓' : s.status === 'doing' ? '◷' : '□';
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', borderRadius: 15,
                background: done ? 'rgba(167,196,188,.09)' : 'rgba(255,255,255,.035)',
                border: done ? '1px solid rgba(167,196,188,.2)' : '1px solid rgba(255,255,255,.08)',
              }}
            >
              <span
                style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(255,255,255,.06)', display: 'grid', placeItems: 'center',
                  color: done ? '#A7C4BC' : accent, fontSize: 17,
                }}
              >
                {icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.4, color: '#eaf3f1' }}>{s.label}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(234,243,241,.5)', marginTop: 2 }}>
                  {done ? 'Terminé' : s.status === 'doing' ? 'En cours' : 'À venir'}
                  {s.due_date
                    ? ` · ${new Date(s.due_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}`
                    : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p style={EMPTY}>Le coach précisera bientôt les prochaines étapes.</p>
    );
  }

  if (k === 'identite') {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 22 }}>
          {[
            ['Sport', d.sport],
            ['Poste', d.poste],
            ['Club', d.club || '—'],
          ].map(([l, v]) => (
            <div
              key={l}
              style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}
            >
              <div style={{ ...LABEL, marginBottom: 3 }}>{l}</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{v}</div>
            </div>
          ))}
        </div>
        <Section label="Histoire sportive">
          {d.sportStory ? (
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: 'rgba(234,243,241,.9)', whiteSpace: 'pre-line' }}>
              {d.sportStory}
            </p>
          ) : (
            <p style={EMPTY}>À renseigner avec le coach.</p>
          )}
        </Section>
        <Section label="Forces (VIA)">
          {d.strengths.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {d.strengths.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: '9px 15px', borderRadius: 12, fontWeight: 600, fontSize: 15, color: '#A7C4BC',
                    background: 'rgba(167,196,188,.14)', border: '1px solid rgba(167,196,188,.25)',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p style={EMPTY}>Forces à identifier ensemble.</p>
          )}
        </Section>
        {d.seasonDream && (
          <div
            style={{
              position: 'relative', padding: '18px 20px 18px 44px', borderRadius: 16,
              background: `${accent}0f`, border: `1px solid ${accent}29`,
            }}
          >
            <span className="disp" style={{ position: 'absolute', left: 14, top: 6, fontSize: 36, color: `${accent}73`, lineHeight: 1 }}>
              “
            </span>
            <div style={{ ...LABEL, color: `${accent}b3`, marginBottom: 4 }}>Rêve de saison</div>
            <p className="disp" style={{ margin: 0, fontStyle: 'italic', fontSize: 19, lineHeight: 1.45, color: '#eaf3f1' }}>
              {d.seasonDream}
            </p>
          </div>
        )}
      </>
    );
  }

  if (k === 'objectif') {
    return (
      <>
        <div
          style={{
            position: 'relative', padding: '20px 22px 20px 46px', borderRadius: 16, marginBottom: 22,
            background: 'rgba(167,196,188,.07)', border: '1px solid rgba(167,196,188,.18)',
          }}
        >
          <span className="disp" style={{ position: 'absolute', left: 15, top: 8, fontSize: 38, color: `${accent}73`, lineHeight: 1 }}>
            “
          </span>
          <div style={{ ...LABEL, marginBottom: 5 }}>Objectif SMART</div>
          <p className="disp" style={{ margin: 0, fontWeight: 500, fontSize: 21, lineHeight: 1.4, color: '#eaf3f1' }}>
            {d.smartGoal || 'Objectif SMART à co-construire avec le coach.'}
          </p>
        </div>
        {d.lifeSkillGoal && (
          <Section label="Objectif life skill">
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: 'rgba(234,243,241,.9)' }}>{d.lifeSkillGoal}</p>
          </Section>
        )}
        {d.myActions.length > 0 && (
          <Section label="Ce qui dépend de moi">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.myActions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'baseline' }}>
                  <span style={{ color: accent, fontSize: 15, flexShrink: 0 }}>✓</span>
                  <span style={{ fontWeight: 500, fontSize: 16, lineHeight: 1.5, color: 'rgba(234,243,241,.9)' }}>{a}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={{ fontSize: 13, color: 'rgba(234,243,241,.55)' }}>Progression du parcours</span>
          <span className="disp" style={{ fontWeight: 600, fontSize: 17, color: accent }}>{d.pct}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
          <div style={{ width: `${d.pct}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg,#A7C4BC,${accent})` }} />
        </div>
      </>
    );
  }

  if (k === 'focus') {
    return (
      <div style={{ textAlign: 'center', padding: '26px 0 10px' }}>
        {d.focusWord ? (
          <>
            <div
              className="disp"
              style={{
                fontWeight: 700, fontSize: 54, letterSpacing: '.04em', color: '#fff7c8',
                textShadow: `0 0 34px ${accent}99`, overflowWrap: 'anywhere', lineHeight: 1.1,
              }}
            >
              {d.focusWord}
            </div>
            <div style={{ ...LABEL, marginTop: 16, marginBottom: 0 }}>Mot-ancre actif de {d.firstName}</div>
            <p style={{ margin: '18px auto 0', maxWidth: 380, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(234,243,241,.6)' }}>
              Choisi à la séance S9, ce mot ramène l’attention au bon endroit dans les moments importants —
              avant un match, un examen, un moment de pression.
            </p>
          </>
        ) : (
          <p style={EMPTY}>Le mot-ancre sera choisi à la séance S9.</p>
        )}
      </div>
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
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, paddingLeft: 6 }}>
        <div
          style={{
            position: 'absolute', left: 24, top: 14, bottom: 14, width: 2,
            background: `linear-gradient(180deg,${d.accent},#A7C4BC 60%,rgba(167,196,188,.3))`,
          }}
        />
        {steps.map(([n, txt], i) => (
          <div key={n} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              className="disp"
              style={{
                zIndex: 1, flexShrink: 0, width: 38, height: 38, borderRadius: '50%',
                background: i === 0 ? `radial-gradient(circle at 40% 35%,#fff7c8,${d.accent} 70%)` : i === 3 ? 'rgba(255,255,255,.06)' : 'radial-gradient(circle at 40% 35%,#dff0ea,#A7C4BC 70%)',
                border: i === 3 ? '1px solid rgba(255,255,255,.16)' : 'none',
                color: i === 3 ? '#eaf3f1' : '#06222a',
                display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15,
              }}
            >
              {n}
            </span>
            <span style={{ fontWeight: i === 3 ? 700 : 500, fontSize: 17, color: i === 3 ? '#eaf3f1' : 'rgba(234,243,241,.88)' }}>
              {txt}
            </span>
          </div>
        ))}
        <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'rgba(234,243,241,.55)' }}>
          Travaillée à la séance S6, cette routine se répète à l’identique avant chaque geste
          important pour installer calme et constance.
        </p>
      </div>
    );
  }

  if (k === 'lettre') {
    return d.letter ? (
      <div
        style={{
          borderRadius: 16, padding: '22px 22px 24px',
          background: 'linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.02))',
          border: '1px solid rgba(255,255,255,.09)',
        }}
      >
        <div className="disp" style={{ fontStyle: 'italic', fontSize: 15, color: 'rgba(234,243,241,.6)', marginBottom: 14 }}>
          Chère {d.firstName},
        </div>
        <p
          className="disp"
          style={{ margin: 0, fontStyle: 'italic', fontSize: 17, lineHeight: 1.7, color: '#eaf3f1', whiteSpace: 'pre-line' }}
        >
          {d.letter}
        </p>
      </div>
    ) : (
      <p style={EMPTY}>La lettre sera écrite lors de la séance bilan (S13), puis scellée ici pendant un an.</p>
    );
  }

  // certificat
  const remaining = Math.max(13 - d.completed, 0);
  return (
    <>
      <p style={{ margin: '0 0 20px', fontSize: 15.5, lineHeight: 1.6, color: 'rgba(234,243,241,.75)' }}>
        Reconnaissance officielle de fin de parcours de {d.firstName} — débloquée à la dernière séance.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ fontSize: 14, color: 'rgba(234,243,241,.6)' }}>{d.completed}/13 séances</span>
        <span className="disp" style={{ fontWeight: 600, fontSize: 16, color: 'rgba(234,243,241,.8)' }}>
          {remaining ? `${remaining} restantes` : 'Parcours complété 🎉'}
        </span>
      </div>
      <div style={{ height: 11, borderRadius: 6, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.round((Math.min(d.completed, 13) / 13) * 100)}%`, height: '100%',
            borderRadius: 6, background: `linear-gradient(90deg,#A7C4BC,${d.accent})`,
          }}
        />
      </div>
    </>
  );
}

export function DetailModal({
  detailKey: k,
  d,
  onClose,
  onExplain,
  onOpenDoc,
}: {
  detailKey: DetailKey;
  d: DetailData;
  onClose: () => void;
  onExplain: () => void;
  onOpenDoc: (docId: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const meta = TITLES[k];
  const docId =
    k === 'lettre' ? d.docIds.letter : k === 'certificat' && d.certificateReady ? d.docIds.certificate : undefined;

  return (
    <div className="b-modal-ov" role="dialog" aria-modal="true" aria-label={meta.title} onClick={onClose}>
      <div className="b-modal" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 14,
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
            color: 'rgba(234,243,241,.75)', fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, paddingRight: 56 }}>
          <span
            style={{
              width: 42, height: 42, borderRadius: 13, background: `${d.accent}17`,
              border: `1px solid ${d.accent}3d`, display: 'grid', placeItems: 'center',
              fontSize: 18, color: d.accent, flexShrink: 0,
            }}
          >
            {meta.icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 className="disp" style={{ margin: 0, fontWeight: 600, fontSize: 22, lineHeight: 1.15 }}>{meta.title}</h2>
            <div style={{ fontSize: 12, color: 'rgba(234,243,241,.5)', marginTop: 3 }}>
              {d.firstName} · {meta.session}
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 0 6px' }}>
          <Body k={k} d={d} />
        </div>

        {docId && (
          <button
            onClick={() => onOpenDoc(docId)}
            style={{
              width: '100%', minHeight: 48, marginTop: 16, borderRadius: 13, border: `1px solid ${d.accent}4d`,
              background: `${d.accent}1f`, color: d.accent, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            ⤓ Télécharger le PDF
          </button>
        )}

        {/* Flèche en bas à droite → fiche d'explication existante (InfoModal) */}
        <div style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none', marginTop: 18 }}>
          <button
            onClick={onExplain}
            aria-label="Comprendre cette carte"
            title="Comprendre cette carte"
            style={{
              pointerEvents: 'auto', width: 52, height: 52, borderRadius: '50%', border: 'none',
              background: d.accent, color: '#06222a', fontSize: 21, fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 10px 28px ${d.accent}59, 0 4px 12px rgba(0,0,0,.4)`,
              display: 'grid', placeItems: 'center',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
