'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Écrans d'une carte « À la maison » (brief §0.4 et §0.7) — présentation ;
// l'état (déverrouillage, enregistrement du moment) vit dans la page.
//
// Trois temps visibles en haut : Ce soir · Maintenant · Et alors ?
// Interactions : étapes qui rebondissent (et vibrent sur Android), bulle
// « Demandez-lui » à toucher pour copier, compteur de silence jusqu'à 5
// (règle n° 2), tampon « Faite », carte suivante proposée.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PRIDE_NOT_REALLY,
  PRIDE_YES,
  scriptToCopy,
  type HomeCard,
} from '@/lib/home-cards';
import { JOKER } from '@/lib/home-cards/guide';
import { Icon } from '@/components/ui';
import { HOME_CARDS_PATH, HomeCardTile, materialsLabel } from './HomeCardTile';
import { CountUp } from './HubPieces';
import { InlineMd, capitalize } from './InlineMd';

const buzz = (ms = 12) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* pas de vibreur : sans conséquence */
  }
};

// ── Barre du haut : fermer + les trois temps ─────────────────────────────────
export function CardTopBar({ phase, onBack }: { phase: 0 | 1 | 2; onBack?: () => void }) {
  const labels = ['Ce soir', 'Maintenant', 'Et alors ?'];
  return (
    <div className="flex items-center gap-3 h-12">
      {onBack ? (
        <button onClick={onBack} aria-label="Revenir à l'écran précédent" className="nc-iconbtn shrink-0 !w-10 !h-10">
          <span aria-hidden className="text-lg leading-none">‹</span>
        </button>
      ) : (
        <Link href={HOME_CARDS_PATH} aria-label="Fermer la carte" className="nc-iconbtn shrink-0 !w-10 !h-10">
          <span aria-hidden className="text-lg leading-none">✕</span>
        </Link>
      )}
      <ol className="flex-1 grid grid-cols-3 gap-1.5" aria-label="Étapes de la carte">
        {labels.map((l, i) => (
          <li key={l} aria-current={i === phase ? 'step' : undefined}>
            <span className="nc-track block !h-1">
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{ width: i <= phase ? '100%' : '0%', background: 'var(--accent-ink)' }}
              />
            </span>
            <span className={`block text-[11px] font-semibold mt-1 ${i === phase ? 'text-night-ink' : 'text-faint'}`}>
              {l}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Écran 1 — « Est-ce que je fais ça ce soir ? » (sans défilement) ─────────
export function ScreenTonight({ card, onGo }: { card: HomeCard; onGo: () => void }) {
  const router = useRouter();
  return (
    <div className="max-w-xl mx-auto">
      <CardTopBar phase={0} />
      <article className="mt-3 rounded-[28px] bg-night-surface p-5 animate-om-up" style={{ boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center h-7 px-3 rounded-full border border-accent-line text-accent-ink text-xs font-bold">
            Idéal après la séance {card.unlock_after_session}
          </span>
          <span className="text-[13px] font-semibold text-accent-ink">{card.duration_min} min</span>
        </div>
        <h1 className="font-display text-[26px] md:text-[32px] font-semibold text-night-ink leading-[1.15] mt-3">
          <InlineMd text={card.title} />
        </h1>
        <p className="text-[13px] text-soft mt-1">
          <InlineMd text={[card.duration_label, materialsLabel(card.materials), ...card.notes].join(' · ')} />
        </p>

        <p className="nc-eyebrow mt-4">Objectif</p>
        <p className="text-[17px] leading-[1.42] text-night-ink font-medium mt-1">
          <InlineMd text={capitalize(card.objective)} />
        </p>

        <p className="nc-eyebrow mt-4">Ce qu&apos;il a fait avec son coach</p>
        <p className="text-[15px] leading-[1.48] text-body mt-1">
          <InlineMd text={card.session_link} />
        </p>
      </article>

      <button
        onClick={() => {
          buzz();
          onGo();
        }}
        className="w-full h-14 mt-4 rounded-full bg-accent text-accent-on font-bold text-[17px] active:scale-[0.98] transition-transform"
      >
        On le fait
      </button>
      <button onClick={() => router.push(HOME_CARDS_PATH)} className="w-full h-11 text-[15px] font-semibold text-soft">
        Plus tard
      </button>
    </div>
  );
}

// ── Écran 2 — « Je le fais, là, maintenant » ────────────────────────────────
export function ScreenNow({ card, onBack, onDone }: { card: HomeCard; onBack: () => void; onDone: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(() => card.steps.map(() => false));
  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === card.steps.length;

  const toggle = (i: number) => {
    buzz(checked[i] ? 6 : 14);
    setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)));
  };

  return (
    <div className="max-w-xl mx-auto hc-slide">
      <CardTopBar phase={1} onBack={onBack} />
      <p className="font-display text-[22px] font-semibold text-night-ink leading-snug mt-3">
        <InlineMd text={card.title} />
      </p>

      <div className="flex items-baseline justify-between mt-5">
        <p className="nc-eyebrow">Comment faire</p>
        <p className="text-[12px] font-semibold text-faint tabular-nums">
          {doneCount}/{card.steps.length}
        </p>
      </div>
      <ul className="mt-2 space-y-2">
        {card.steps.map((s, i) => (
          <li key={i}>
            <button
              role="checkbox"
              aria-checked={checked[i]}
              onClick={() => toggle(i)}
              className="nc-row w-full flex items-start gap-3.5 px-4 py-4 text-left active:scale-[0.99] transition-transform"
            >
              <span
                aria-hidden
                key={String(checked[i])}
                className={`mt-0.5 w-7 h-7 rounded-full grid place-items-center shrink-0 text-[13px] font-bold ${
                  checked[i] ? 'bg-accent text-accent-on hc-pop' : 'border-2 border-line2 text-soft'
                }`}
              >
                {checked[i] ? <Icon name="check" className="w-4 h-4" /> : i + 1}
              </span>
              <span
                className={`text-[16px] leading-[1.5] transition-colors ${checked[i] ? 'text-faint line-through decoration-line2' : 'text-body'}`}
              >
                <InlineMd text={s} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <ScriptBubble script={card.script} />

      <div className="mt-5 space-y-2">
        <Fold title="À éviter">
          <InlineMd text={capitalize(card.trap)} />
        </Fold>
        <Fold title="Ce que ça travaille">
          <InlineMd text={card.what_it_builds} />
        </Fold>
      </div>

      <div className="nc-card mt-3">
        <p className="nc-eyebrow">C&apos;est réussi si</p>
        <p className="text-[15px] leading-[1.5] text-body mt-1">
          <InlineMd text={capitalize(card.success_marker)} />
        </p>
      </div>

      <button
        onClick={() => {
          buzz(20);
          onDone();
        }}
        className={`w-full h-14 mt-6 rounded-full bg-accent text-accent-on font-bold text-[17px] active:scale-[0.98] transition-transform ${
          allDone ? 'animate-om-ring' : ''
        }`}
      >
        C&apos;est fait
      </button>
    </div>
  );
}

// Bulle « Demandez-lui » : la phrase en grand, un toucher la copie ; dessous,
// le compteur de silence (« Comptez jusqu'à 5 avant de relancer »).
function ScriptBubble({ script }: { script: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(scriptToCopy(script));
      buzz();
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* presse-papiers refusé : le texte reste sélectionnable */
    }
  };

  return (
    <div className="mt-7">
      <div className="flex items-baseline justify-between">
        <p className="nc-eyebrow">Demandez-lui</p>
        <p className="text-[12px] font-semibold text-faint" aria-live="polite">
          {copied ? 'Copié' : 'Touchez pour copier'}
        </p>
      </div>
      <button
        onClick={copy}
        className="mt-2 w-full text-left rounded-[24px] rounded-bl-md px-5 py-5 select-text active:scale-[0.99] transition-transform"
        style={{ background: 'var(--bub-out)', color: 'var(--bub-out-text)', boxShadow: 'var(--bub-shadow)' }}
      >
        {/* Indications entre parenthèses : pour le parent, plus petites, jamais copiées */}
        <span className="block font-display text-[23px] md:text-[25px] font-semibold leading-[1.33] [&_em]:block [&_em]:my-1 [&_em]:font-sans [&_em]:text-[14px] [&_em]:font-medium [&_em]:opacity-75">
          <InlineMd text={script} />
        </span>
      </button>
      <SilenceCounter />
    </div>
  );
}

function SilenceCounter() {
  const [count, setCount] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const start = () => {
    if (timer.current) clearInterval(timer.current);
    setCount(0);
    timer.current = setInterval(() => {
      setCount((c) => {
        const next = (c ?? 0) + 1;
        if (next >= 5 && timer.current) {
          clearInterval(timer.current);
          buzz(30);
        }
        return next;
      });
    }, 1000);
  };

  const finished = count !== null && count >= 5;

  return (
    <button
      onClick={start}
      className="mt-2 w-full nc-row-idle flex items-center gap-3 px-4 py-3 text-left"
      aria-live="polite"
    >
      <span className="flex gap-1.5 shrink-0" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
            style={{ background: count !== null && count >= n ? 'var(--accent-ink)' : 'var(--line2)' }}
          />
        ))}
      </span>
      <span className="text-[14px] text-body">
        {count === null
          ? 'Il parle en premier. Comptez jusqu’à 5.'
          : finished
            ? 'Cinq secondes. Vous pouvez relancer.'
            : `${count}…`}
      </span>
    </button>
  );
}

// ── Après « C'est fait » ────────────────────────────────────────────────────
export function ScreenCheck({ card, onYes, onNotReally }: { card: HomeCard; onYes: () => void; onNotReally: () => void }) {
  return (
    <div className="max-w-xl mx-auto hc-slide">
      <CardTopBar phase={2} />
      <p className="nc-eyebrow mt-8">C&apos;est réussi si</p>
      <p className="font-display text-[26px] font-semibold text-night-ink leading-[1.28] mt-2">
        <InlineMd text={capitalize(card.success_marker)} />
      </p>
      <h2 className="text-[17px] font-semibold text-body mt-10">Ça s&apos;est passé ?</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={onYes}
          className="h-16 rounded-[20px] bg-accent text-accent-on font-bold text-[18px] active:scale-[0.97] transition-transform"
        >
          Oui
        </button>
        <button
          onClick={onNotReally}
          className="h-16 rounded-[20px] border border-line2 text-night-ink font-semibold text-[18px] active:scale-[0.97] transition-transform"
        >
          Pas vraiment
        </button>
      </div>
    </div>
  );
}

export function PrideYes({
  card,
  count,
  next,
  nextDone,
}: {
  card: HomeCard | null;
  count: number;
  next: HomeCard | null;
  nextDone?: boolean;
}) {
  return (
    <div className="max-w-xl mx-auto pt-4 animate-om-up">
      {/* La carte reçoit son tampon */}
      <div className="relative rounded-[24px] bg-night-surface px-5 py-4" style={{ boxShadow: 'var(--shadow)' }}>
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">
          {card ? `Séance ${card.session}` : 'Joker'}
        </p>
        <p className="font-display text-[20px] font-semibold text-night-ink leading-snug mt-1 pr-20">
          {card ? <InlineMd text={card.title} /> : JOKER.title}
        </p>
        <span className="hc-stamp absolute right-4 top-1/2 -translate-y-1/2 border-2 border-sage text-sage rounded-lg px-2.5 py-1 text-sm font-bold uppercase tracking-wider">
          Faite
        </span>
      </div>

      <p className="font-display text-[28px] font-semibold text-night-ink leading-[1.2] mt-8">{PRIDE_YES}</p>
      {count > 0 && (
        <p className="text-[16px] text-body mt-4">
          <span className="font-display text-[22px] font-semibold text-accent-ink">
            <CountUp value={count} />
          </span>{' '}
          {count > 1 ? 'moments' : 'moment'} avec votre enfant depuis le début du programme.
        </p>
      )}

      {next && (
        <div className="mt-8">
          <p className="nc-eyebrow mb-2">Une prochaine fois</p>
          <HomeCardTile card={next} done={nextDone} />
        </div>
      )}
      <Link
        href={HOME_CARDS_PATH}
        className="mt-6 w-full h-14 rounded-full bg-accent text-accent-on font-bold text-[17px] grid place-items-center"
      >
        Retour aux cartes
      </Link>
    </div>
  );
}

export function PrideNotReally({ onRetry, next }: { onRetry: () => void; next: HomeCard | null }) {
  return (
    <div className="max-w-xl mx-auto pt-10 animate-om-up">
      <p className="font-display text-[28px] font-semibold text-night-ink leading-[1.2]">{PRIDE_NOT_REALLY}</p>
      <button
        onClick={onRetry}
        className="mt-8 w-full h-14 rounded-full bg-accent text-accent-on font-bold text-[17px] active:scale-[0.98] transition-transform"
      >
        La refaire
      </button>
      {next && (
        <div className="mt-6">
          <p className="nc-eyebrow mb-2">Ou en essayer une autre</p>
          <HomeCardTile card={next} />
        </div>
      )}
      <Link href={HOME_CARDS_PATH} className="mt-3 w-full h-12 grid place-items-center text-[15px] font-semibold text-soft">
        Retour aux cartes
      </Link>
    </div>
  );
}

// ── Carte joker — disponible dès l'inscription ──────────────────────────────
export function JokerScreen({ onDone }: { onDone: () => void }) {
  const [sat, setSat] = useState(false);
  return (
    <div className="max-w-xl mx-auto">
      <CardTopBar phase={sat ? 1 : 0} />
      <div className="animate-om-up">
        <p className="nc-eyebrow mt-4">{JOKER.subtitle}</p>
        <h1 className="font-display text-[30px] font-semibold text-night-ink leading-tight mt-1.5">{JOKER.title}</h1>
        <p className="text-[15px] leading-[1.55] text-body mt-3">{JOKER.intro}</p>

        <div className="rounded-[28px] mt-5 p-5 border border-accent-line" style={{ background: 'var(--lock-bg)' }}>
          <p className="font-semibold text-night-ink text-[15px]">{JOKER.sit}</p>
          <div
            className="mt-3 rounded-[22px] rounded-bl-md px-5 py-4"
            style={{ background: 'var(--bub-out)', color: 'var(--bub-out-text)', boxShadow: 'var(--bub-shadow)' }}
          >
            <p className="font-display text-[22px] font-semibold leading-[1.35]">{JOKER.script}</p>
          </div>
          <p className="text-[15px] text-body mt-4">
            <strong className="font-semibold text-night-ink">{JOKER.then}</strong> {JOKER.thenRest}
          </p>
        </div>

        {sat ? <FiveMinutes /> : null}

        <p className="text-[15px] leading-[1.55] text-soft mt-5">{JOKER.outro}</p>

        {sat ? (
          <button
            onClick={onDone}
            className="w-full h-14 mt-6 rounded-full bg-accent text-accent-on font-bold text-[17px] active:scale-[0.98] transition-transform"
          >
            C&apos;est fait
          </button>
        ) : (
          <button
            onClick={() => {
              buzz();
              setSat(true);
            }}
            className="w-full h-14 mt-6 rounded-full bg-accent text-accent-on font-bold text-[17px] active:scale-[0.98] transition-transform"
          >
            Je m&apos;assois à côté de lui
          </button>
        )}
      </div>
    </div>
  );
}

// Les 5 minutes du joker : une barre qui se remplit, sans chiffre qui défile —
// on pose le téléphone, on ne regarde pas un chrono.
function FiveMinutes() {
  return (
    <div className="mt-5 hc-expand">
      <div className="flex items-baseline justify-between">
        <p className="nc-eyebrow">Restez 5 minutes</p>
        <p className="text-[12px] text-faint">Posez le téléphone</p>
      </div>
      <div className="nc-track mt-2">
        <div
          className="h-full rounded-[3px] origin-left"
          style={{ background: 'var(--accent)', animation: 'om-growx 300s linear both' }}
        />
      </div>
    </div>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────────
function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="nc-row group">
      <summary className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer select-none min-h-[52px]">
        <span className="text-[15px] font-semibold text-night-ink">{title}</span>
        <span aria-hidden className="text-faint text-lg leading-none transition-transform group-open:rotate-90">›</span>
      </summary>
      <p className="px-4 pb-4 text-[15px] leading-[1.55] text-body">{children}</p>
    </details>
  );
}

export function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl mx-auto animate-om-up">
      <Link href={HOME_CARDS_PATH} className="flex w-fit items-center gap-1 h-11 text-sm font-semibold text-soft">
        ‹ À la maison
      </Link>
      <div className="nc-card mt-2">
        <p className="font-display text-[21px] font-semibold text-night-ink leading-snug">{title}</p>
        <p className="text-[15px] leading-[1.55] text-soft mt-1.5">{body}</p>
      </div>
    </div>
  );
}
