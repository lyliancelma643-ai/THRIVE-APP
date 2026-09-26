'use client';

// Supports visuels du mode activité, en option : le parent touche le bouton,
// tend le téléphone, et l'enfant MONTRE DU DOIGT (une émotion, un chiffre, un
// endroit…). Nommer devient plus facile quand on peut d'abord pointer.
// Toucher une case la met en avant, pour que les deux voient la même chose.

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import type { VisualId } from '@/lib/p3-moments';

export const VISUAL_LABELS: Record<VisualId, string> = {
  emotions: 'Les six émotions',
  thermometre: 'Le thermomètre',
  colonnes: 'Les deux colonnes',
  escalier: 'L’escalier',
  carte: 'La carte de ses personnes',
  sens: 'Les trois sens',
  endroits: 'Trois endroits',
  outils: 'Ses outils',
};

const VISUAL_HINTS: Record<VisualId, string> = {
  emotions: 'Il montre du doigt l’émotion. Touchez-la pour l’agrandir.',
  thermometre: 'Il montre son chiffre, de 1 (tout calme) à 10 (ça déborde).',
  colonnes: 'Le modèle à recopier sur une feuille. L’exemple est volontairement sur un autre sujet.',
  escalier: 'Le modèle à dessiner : son objectif tout en haut, la marche la plus facile en bas.',
  carte: 'Le modèle à dessiner : lui au milieu, ses personnes autour.',
  sens: 'Une question à la fois, dans cet ordre.',
  endroits: 'Pour chaque outil, un usage à chaque endroit.',
  outils: 'S’il ne se souvient plus, pointez un outil : « Celui-là, tu pourrais l’utiliser où ? »',
};

export const EMOTIONS = [
  { id: 'joie', label: 'La joie', emoji: '😄', color: '#F5B301' },
  { id: 'peur', label: 'La peur', emoji: '😨', color: '#7C3AED' },
  { id: 'colere', label: 'La colère', emoji: '😠', color: '#DC2626' },
  { id: 'frustration', label: 'La frustration', emoji: '😤', color: '#EA580C' },
  { id: 'fierte', label: 'La fierté', emoji: '😎', color: '#16A34A' },
  { id: 'nervosite', label: 'La nervosité', emoji: '😬', color: '#0891B2' },
] as const;

/** Les outils des 13 semaines, avec la fiche où l'enfant les a notés dans ses mots. */
export const TOOLS: { emoji: string; name: string; ask: string; what: string; week: number; from: string[] }[] = [
  { emoji: '💪', name: 'Mes forces', ask: 'Tes forces', what: 'Ce que je fais bien, avec la preuve.', week: 1, from: ['ACT-0101'] },
  { emoji: '✋', name: 'Ce qui dépend de moi', ask: 'Tes deux colonnes', what: 'Les deux colonnes : je m’occupe de ma colonne.', week: 2, from: ['ACT-0201'] },
  { emoji: '🪜', name: 'Mon escalier', ask: 'Ton escalier', what: 'Une marche à la fois, la plus petite d’abord.', week: 2, from: ['ACT-0202', 'ACT-0702'] },
  { emoji: '🎯', name: 'Un cran au-dessus', ask: 'Ton défi un cran au-dessus', what: 'Le défi que je réussis une fois sur trois.', week: 3, from: ['ACT-0302'] },
  { emoji: '🎭', name: 'Mettre un mot', ask: 'Mettre un mot sur ce que tu sens', what: 'Je nomme mon émotion quand elle arrive.', week: 4, from: ['ACT-0401', 'ACT-0402'] },
  { emoji: '🎈', name: 'Le ballon', ask: 'Ton ballon', what: 'Je gonfle mon ventre sur 4, je dégonfle sur 8.', week: 5, from: ['ACT-0501'] },
  { emoji: '💬', name: 'Ma phrase', ask: 'Ta phrase', what: 'Ce que je me dis pour recommencer.', week: 5, from: ['ACT-0502', 'ACT-0504'] },
  { emoji: '🍝', name: 'Spaghetti cuit', ask: 'Ton spaghetti cuit', what: 'Je relâche tout et je sens mes pieds.', week: 6, from: ['ACT-0601', 'ACT-0602'] },
  { emoji: '🤝', name: 'Mes personnes', ask: 'Tes personnes', what: 'Je sais qui aller voir, et pour quoi.', week: 8, from: ['ACT-0801', 'ACT-0804'] },
  { emoji: '🔦', name: 'Mon mot', ask: 'Ton mot', what: 'Il ramène ma tête quand elle part ailleurs.', week: 9, from: ['ACT-0901'] },
  { emoji: '🎬', name: 'Mon film', ask: 'Ton film', what: 'Je me vois réussir avant de le faire.', week: 10, from: ['ACT-1001', 'ACT-1002'] },
];

function Tile({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[22px] border-2 p-3 flex flex-col items-center justify-center text-center transition-transform motion-reduce:transition-none ${
        active ? 'scale-[1.04]' : 'border-line2'
      }`}
      style={active && color ? { borderColor: color, background: `color-mix(in srgb, ${color} 18%, transparent)` } : undefined}
    >
      {children}
    </button>
  );
}

function Emotions() {
  const [sel, setSel] = useState<string | null>(null);
  const picked = EMOTIONS.find((e) => e.id === sel);
  return (
    <>
      {picked && (
        <div className="mb-4 rounded-[26px] p-5 text-center" style={{ background: `color-mix(in srgb, ${picked.color} 22%, transparent)` }}>
          <p className="text-[96px] leading-none" aria-hidden>
            {picked.emoji}
          </p>
          <p className="mt-2 font-display text-[34px] font-semibold text-ink">{picked.label}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {EMOTIONS.map((e) => (
          <Tile key={e.id} active={sel === e.id} color={e.color} onClick={() => setSel(sel === e.id ? null : e.id)}>
            <span className="text-[54px] leading-none" aria-hidden>
              {e.emoji}
            </span>
            <span className="mt-2 text-[18px] font-semibold text-ink">{e.label}</span>
          </Tile>
        ))}
      </div>
    </>
  );
}

function Thermometre() {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="flex gap-4 items-stretch">
      <div className="flex flex-col-reverse gap-1.5 flex-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const hue = 130 - (n - 1) * 14; // vert → rouge
          const color = `hsl(${hue} 70% 45%)`;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setSel(sel === n ? null : n)}
              aria-pressed={sel === n}
              className={`h-11 rounded-[12px] flex items-center justify-between px-4 text-white font-bold text-[18px] transition-transform motion-reduce:transition-none ${sel === n ? 'scale-x-[1.05] ring-4 ring-white/70' : ''}`}
              style={{ background: color }}
            >
              <span className="tabular-nums">{n}</span>
              <span className="text-[13px] font-semibold opacity-90">{n === 1 ? 'tout calme' : n === 10 ? 'ça déborde' : ''}</span>
            </button>
          );
        })}
      </div>
      {sel !== null && (
        <div className="w-24 grid place-items-center">
          <span className="font-display text-[72px] font-semibold text-ink tabular-nums">{sel}</span>
        </div>
      )}
    </div>
  );
}

function Colonnes() {
  return (
    <div>
      <p className="text-[14px] text-soft mb-3">Exemple : réussir un gâteau</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border-2 border-[#16A34A] p-4">
          <p className="text-[34px]" aria-hidden>
            ✋
          </p>
          <p className="mt-1 font-semibold text-[17px] text-ink">Ça dépend de moi</p>
          <ul className="mt-3 space-y-1.5 text-[15px] text-body">
            <li>Suivre la recette</li>
            <li>Bien mesurer</li>
            <li>Demander de l’aide</li>
          </ul>
        </div>
        <div className="rounded-[20px] border-2 border-line2 p-4">
          <p className="text-[34px]" aria-hidden>
            🌦️
          </p>
          <p className="mt-1 font-semibold text-[17px] text-ink">Ça ne dépend pas de moi</p>
          <ul className="mt-3 space-y-1.5 text-[15px] text-body">
            <li>Le four qui chauffe mal</li>
            <li>Les goûts des invités</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Escalier() {
  const steps = ['La plus facile', 'Un peu plus dure', 'Encore un peu plus', 'Ton objectif'];
  return (
    <div className="flex flex-col-reverse gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex" style={{ paddingLeft: `${i * 18}%` }}>
          <div
            className={`flex-1 rounded-[14px] px-4 py-3 text-[16px] font-semibold ${i === 3 ? 'bg-accent text-accent-on' : 'bg-surface-sub text-ink border border-line2'}`}
          >
            <span className="text-soft mr-2 tabular-nums">{i + 1}</span>
            {i === 3 ? '🏁 ' : ''}
            {s}
          </div>
        </div>
      ))}
    </div>
  );
}

function Carte() {
  const around = ['Prénom — pour quoi ?', 'Prénom — pour quoi ?', 'Prénom — pour quoi ?', 'Hors de la maison ?'];
  return (
    <div className="relative mx-auto aspect-square max-w-[340px]">
      <div className="absolute inset-[34%] rounded-full bg-accent text-accent-on grid place-items-center font-display text-[26px] font-semibold">
        Toi
      </div>
      {around.map((a, i) => {
        const pos = [
          'top-0 left-1/2 -translate-x-1/2',
          'top-1/2 right-0 -translate-y-1/2',
          'bottom-0 left-1/2 -translate-x-1/2',
          'top-1/2 left-0 -translate-y-1/2',
        ][i];
        return (
          <div key={i} className={`absolute ${pos} w-[31%] aspect-square rounded-full border-2 border-dashed border-line2 grid place-items-center text-center p-2 text-[12px] text-body`}>
            {a}
          </div>
        );
      })}
    </div>
  );
}

function ListVisual({ items }: { items: { emoji: string; title: string; sub?: string }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <button
          key={it.title}
          type="button"
          onClick={() => setSel(sel === i ? null : i)}
          aria-pressed={sel === i}
          className={`w-full flex items-center gap-4 rounded-[20px] border-2 p-4 text-left transition-transform motion-reduce:transition-none ${sel === i ? 'border-accent scale-[1.02]' : 'border-line2'}`}
        >
          <span className="text-[44px] leading-none" aria-hidden>
            {it.emoji}
          </span>
          <span>
            <span className="block font-display text-[24px] font-semibold text-ink">{it.title}</span>
            {it.sub && <span className="block text-[15px] text-body mt-0.5">{it.sub}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Outils({ notes }: { notes: Record<string, string> }) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="space-y-2.5">
      {TOOLS.map((t, i) => {
        const his = t.from.map((id) => notes[id]).find(Boolean);
        const open = sel === i;
        return (
          <button
            key={t.name}
            type="button"
            onClick={() => setSel(open ? null : i)}
            aria-expanded={open}
            className={`w-full rounded-[18px] border-2 p-3.5 text-left transition-colors ${open ? 'border-accent' : 'border-line2'}`}
          >
            <span className="flex items-center gap-3">
              <span className="text-[32px] leading-none" aria-hidden>
                {t.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold text-ink">{t.name}</span>
                <span className="block text-[14px] text-body">{t.what}</span>
              </span>
            </span>
            {his && <span className="block mt-2 text-[14px] text-soft">Dans ses mots : « {his} »</span>}
            {open && (
              <span className="block mt-3 rounded-[14px] bg-surface-sub p-3 text-[16px] text-ink">
                Demandez : « {t.ask}, tu pourrais t’en servir où ? »
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function VisualBody({ id, notes }: { id: VisualId; notes: Record<string, string> }) {
  switch (id) {
    case 'emotions':
      return <Emotions />;
    case 'thermometre':
      return <Thermometre />;
    case 'colonnes':
      return <Colonnes />;
    case 'escalier':
      return <Escalier />;
    case 'carte':
      return <Carte />;
    case 'sens':
      return (
        <ListVisual
          items={[
            { emoji: '👀', title: 'Tu vois quoi ?', sub: 'Les couleurs, les gens, l’endroit.' },
            { emoji: '👂', title: 'Tu entends quoi ?', sub: 'Les bruits, les voix, le silence.' },
            { emoji: '✋', title: 'Tu sens quoi ?', sub: 'Dans tes mains, tes pieds, ton ventre.' },
          ]}
        />
      );
    case 'endroits':
      return (
        <ListVisual
          items={[
            { emoji: '🏫', title: 'L’école', sub: 'En classe, en examen, à la récré.' },
            { emoji: '👫', title: 'Les amis', sub: 'Au sport, dehors, en ligne.' },
            { emoji: '🏠', title: 'La maison', sub: 'Les devoirs, les disputes, le coucher.' },
          ]}
        />
      );
    case 'outils':
      return <Outils notes={notes} />;
  }
}

/** Plein écran : le visuel en grand, à montrer à l'enfant. */
export function VisualSheet({ id, notes, onClose }: { id: VisualId; notes: Record<string, string>; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[85] bg-night-bg overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label={VISUAL_LABELS[id]}>
      <div className="max-w-xl mx-auto px-5 safe-top pb-10">
        <div className="flex items-center justify-between h-16">
          <p className="font-display text-[22px] font-semibold text-ink">{VISUAL_LABELS[id]}</p>
          <button type="button" onClick={onClose} className="nc-iconbtn" aria-label="Fermer le visuel">
            <Icon name="plus" className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <p className="text-[14px] text-soft mb-5">{VISUAL_HINTS[id]}</p>
        <VisualBody id={id} notes={notes} />
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full h-[52px] rounded-full border border-line2 text-[16px] font-semibold text-ink"
        >
          Revenir à l’activité
        </button>
      </div>
    </div>
  );
}

/** Bouton « Montrer : … » à placer dans une étape. */
export function VisualButton({ id, onOpen }: { id: VisualId; onOpen: (id: VisualId) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="mt-4 w-full flex items-center gap-3 rounded-[18px] border-2 border-accent-line p-3.5 text-left"
    >
      <span className="text-[28px] leading-none" aria-hidden>
        {id === 'emotions' ? '😄' : id === 'thermometre' ? '🌡️' : id === 'colonnes' ? '✋' : id === 'escalier' ? '🪜' : id === 'carte' ? '🤝' : id === 'sens' ? '👀' : id === 'endroits' ? '🏫' : '🧰'}
      </span>
      <span className="flex-1">
        <span className="block text-[16px] font-semibold text-ink">Montrer : {VISUAL_LABELS[id]}</span>
        <span className="block text-[13px] text-soft">À l’écran, pour qu’il montre du doigt</span>
      </span>
      <Icon name="chevron-right" className="w-5 h-5 text-soft" />
    </button>
  );
}
