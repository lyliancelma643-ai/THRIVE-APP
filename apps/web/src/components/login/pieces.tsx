'use client';

// Briques visuelles de l'écran d'accueil / connexion : l'arche de la mascotte
// (même passe-partout de lin que l'onglet Maison), les lignes de piste, le ciel
// étoilé, les champs et boutons de la marque, le choix de langue.
import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { PASSWORD_MIN_LENGTH, passwordError } from '@thrive/shared';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { Lang } from './i18n';

export const MASCOT = {
  hello: '/p3/vignettes/ACT-0501.webp',
  shield: '/p3/vignettes/BON-01.webp',
  me: '/p3/vignettes/ACT-0101.webp',
  sports: '/p3/vignettes/ACT-0301.webp',
  letter: '/p3/vignettes/ACT-1201.webp',
  party: '/p3/vignettes/ACT-1303.webp',
} as const;

/** La mascotte dans son arche de lin, qui flotte doucement. */
export function MascotArch({
  src,
  alt,
  className = '',
  mat = 10,
  priority = false,
  small = false,
}: {
  src: string;
  alt: string;
  className?: string;
  mat?: number;
  priority?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`login-arch login-float shrink-0 aspect-[312/348] ${small ? 'login-arch-sm' : ''} ${className}`}
      style={{ '--login-mat': `${mat}px` } as CSSProperties}
    >
      <div className="login-arch-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={512}
          height={512}
          draggable={false}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

const STARS: [string, string, number, string, string][] = [
  ['10%', '11%', 2, '#f7f5f2', '0s'],
  ['25%', '18%', 3, '#f9eb50', '1.4s'],
  ['82%', '14%', 2, '#f7f5f2', '.6s'],
  ['90%', '25%', 2, '#a7c4bc', '2.2s'],
  ['6%', '31%', 2, '#f7f5f2', '3s'],
  ['67%', '9%', 2, '#f7f5f2', '1.9s'],
  ['38%', '10%', 2, '#a7c4bc', '.3s'],
];

/** Ciel étoilé discret (décoratif). */
export function Stars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {STARS.map(([left, top, size, color, delay]) => (
        <span
          key={`${left}${top}`}
          className="login-twinkle absolute rounded-full"
          style={{ left, top, width: size, height: size, background: color, animationDelay: delay }}
        />
      ))}
    </div>
  );
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`absolute ${className}`}>
      <path
        d="M12 2c.6 4.6 2.4 6.9 7 7.6-4.6.7-6.4 3-7 7.6-.6-4.6-2.4-6.9-7-7.6 4.6-.7 6.4-3 7-7.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * La scène : halo doré, lignes de piste en perspective, la mascotte dans son
 * arche et sa bulle. `scale` agrandit le tout (ordinateur).
 */
export function HeroScene({
  src,
  alt,
  bubble,
  big = false,
}: {
  src: string;
  alt: string;
  bubble?: string;
  big?: boolean;
}) {
  const rings = big
    ? [840, 680, 536, 410]
    : [600, 480, 380, 296];
  const alphas = [0.06, 0.1, 0.15, 0.22];
  return (
    <div className="relative flex w-full items-center justify-center py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: big ? 480 : 360,
          height: big ? 480 : 360,
          background:
            'radial-gradient(circle, rgba(249,235,80,.17) 0%, rgba(249,235,80,.05) 38%, rgba(249,235,80,0) 66%)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute bottom-[30px] left-1/2 h-0 w-0">
        {rings.map((w, i) => (
          <span
            key={w}
            className="absolute rounded-[50%]"
            style={{
              width: w,
              height: Math.round(w * 0.2),
              left: -w / 2,
              top: -Math.round(w * 0.1),
              border: `1px solid rgba(167,196,188,${alphas[i]})`,
            }}
          />
        ))}
        <span
          className="absolute rounded-[50%]"
          style={{
            width: big ? 280 : 220,
            height: big ? 32 : 28,
            left: big ? -140 : -110,
            top: big ? -16 : -14,
            background: 'radial-gradient(closest-side, rgba(0,0,0,.55), rgba(0,0,0,0))',
          }}
        />
      </div>
      <Sparkle className={`text-sun ${big ? 'left-[calc(50%-230px)] top-[14%] h-7 w-7' : 'left-[calc(50%-150px)] top-[10%] h-[22px] w-[22px]'}`} />
      <Sparkle className={`text-sage ${big ? 'left-[calc(50%-192px)] top-[25%] h-3.5 w-3.5' : 'left-[calc(50%-122px)] top-[22%] h-3 w-3'}`} />

      <div className="relative">
        <MascotArch
          src={src}
          alt={alt}
          priority
          mat={big ? 12 : 10}
          className={big ? 'w-[300px]' : 'w-[min(236px,62vw)]'}
        />
        {bubble && (
          <p
            className={`absolute w-max rounded-[18px] rounded-bl-md bg-cream font-semibold leading-snug text-navy-900 shadow-[0_14px_30px_-10px_rgba(0,0,0,.6)] ${
              big
                ? 'left-[calc(50%+112px)] top-[52px] max-w-[200px] px-4 py-3 text-[15px]'
                : 'left-[calc(50%+48px)] top-[30px] max-w-[128px] px-3.5 py-2.5 text-sm'
            }`}
          >
            {bubble}
          </p>
        )}
      </div>
    </div>
  );
}

/** Pastilles FR / EN. */
export function LangSwitch({
  lang,
  onChange,
  label,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-0.5 rounded-full border border-white/10 bg-white/[.06] p-[3px]"
    >
      {(['fr', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
          className={`h-[38px] min-w-[44px] rounded-full px-2.5 text-xs font-bold uppercase tracking-[.08em] transition-colors duration-base ${
            lang === l ? 'bg-sun text-navy-900' : 'text-[rgba(234,243,241,.75)] hover:text-cream'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** Rond « retour » de l'en-tête. */
export function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[.06] text-cream transition-colors hover:bg-white/10"
    >
      <Icon name="chevron-left" className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase leading-none tracking-[.22em] text-sage">
      {children}
    </p>
  );
}

/** Titre d'écran en Fraunces, légèrement adouci. */
export function Title({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={`font-display font-medium leading-[1.04] tracking-[-.01em] text-balance [font-variation-settings:'SOFT'_50] ${className}`}
    >
      {children}
    </h1>
  );
}

export function Lead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[15px] leading-relaxed text-[rgba(234,243,241,.8)] text-pretty ${className}`}>
      {children}
    </p>
  );
}

/** Champ sombre avec libellé, icône et accessoire à droite (œil…). */
export function Field({
  id,
  label,
  icon,
  trailing,
  aside,
  ...input
}: {
  id: string;
  label: string;
  icon?: IconName;
  trailing?: ReactNode;
  aside?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-[rgba(234,243,241,.82)]">
          {label}
        </label>
        {aside}
      </div>
      <div
        className={`login-field flex h-[54px] items-center gap-2.5 rounded-2xl border border-white/[.12] bg-white/[.06] text-[rgba(234,243,241,.6)] ${
          trailing ? 'pl-4 pr-1' : 'px-4'
        }`}
      >
        {icon && <Icon name={icon} className="h-[18px] w-[18px] shrink-0" />}
        <input
          id={id}
          {...input}
          className="h-full min-w-0 flex-1 bg-transparent text-base font-medium text-cream"
        />
        {trailing}
      </div>
    </div>
  );
}

/** Bouton œil pour afficher / masquer un mot de passe. */
export function RevealButton({
  shown,
  onToggle,
  showLabel,
  hideLabel,
}: {
  shown: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? hideLabel : showLabel}
      aria-pressed={shown}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[rgba(234,243,241,.72)] transition-colors hover:text-cream"
    >
      <Icon name={shown ? 'eye-off' : 'eye'} className="h-5 w-5" />
    </button>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-navy-900/25 border-t-navy-900"
    />
  );
}

/** Bouton principal jaune soleil, avec son halo qui respire. */
export function SunButton({
  children,
  loading = false,
  icon = 'arrow-right',
  className = '',
  ...rest
}: {
  children: ReactNode;
  loading?: boolean;
  icon?: IconName | null;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      aria-busy={loading || undefined}
      className={`login-sun flex h-14 w-full items-center justify-center gap-2.5 rounded-full text-base font-bold transition-[filter] duration-fast hover:brightness-105 disabled:cursor-default disabled:opacity-80 ${className}`}
    >
      {loading && <Spinner />}
      <span>{children}</span>
      {!loading && icon && <Icon name={icon} className="h-[18px] w-[18px]" strokeWidth={2.2} />}
    </button>
  );
}

/** Bouton secondaire transparent, filet clair. */
export function GhostButton({
  children,
  className = '',
  ...rest
}: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`flex h-14 w-full items-center justify-center rounded-full border border-white/[.16] bg-white/[.05] text-base font-semibold text-cream transition-colors hover:bg-white/[.09] ${className}`}
    >
      {children}
    </button>
  );
}

/** Message d'erreur ou d'information dans un formulaire. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-[rgba(252,165,165,.22)] bg-[rgba(252,165,165,.08)] px-3 py-2.5 text-sm leading-snug text-[#fca5a5]"
    >
      <Icon name="close" className="mt-px h-4 w-4 shrink-0" strokeWidth={2.2} />
      <span>{children}</span>
    </p>
  );
}

/** Jauge de solidité du mot de passe (0 à 4). */
export function passwordLevel(pw: string): number {
  if (!pw) return 0;
  // Même règle que le serveur (@thrive/shared validation/password) : 12 car.,
  // minuscule + majuscule + chiffre. En dessous, le niveau reste « Trop court ».
  if (passwordError(pw)) return pw.length < PASSWORD_MIN_LENGTH ? 1 : 2;
  return pw.length >= 16 ? 4 : 3;
}

const LEVEL_COLORS = ['rgba(255,255,255,.12)', '#e78a8a', '#e0b45a', '#a7c4bc', '#a7c4bc'];

export function StrengthMeter({ level, hint, labels, id }: { level: number; hint: string; labels: string[]; id: string }) {
  const tone = LEVEL_COLORS[level];
  return (
    <div className="-mt-0.5 flex flex-col gap-2">
      <div aria-hidden className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1 rounded-full transition-colors duration-slow"
            style={{ background: level >= i ? tone : LEVEL_COLORS[0] }}
          />
        ))}
      </div>
      <div id={id} className="flex justify-between text-xs font-medium text-[rgba(234,243,241,.66)]">
        <span>{hint}</span>
        <span aria-live="polite" className="font-bold" style={{ color: tone }}>
          {labels[level]}
        </span>
      </div>
    </div>
  );
}

/** Indicateur d'étape (deux segments) pour l'inscription. */
export function Steps({ label, current }: { label: string; current: 1 | 2 }) {
  return (
    <div className="flex flex-col items-center gap-[7px]">
      <span className="text-xs font-bold tracking-[.06em] text-[rgba(234,243,241,.82)]">{label}</span>
      <div aria-hidden className="flex gap-1">
        <span className="h-1 w-[34px] rounded-full bg-sun" />
        <span className={`h-1 w-[34px] rounded-full ${current === 2 ? 'bg-sun' : 'bg-white/[.14]'}`} />
      </div>
    </div>
  );
}

const CONFETTI: [string, string, number, number, string, string, string][] = [
  ['7%', '13%', 8, 14, '#f9eb50', '18deg', '0s'],
  ['19%', '21%', 6, 10, '#a7c4bc', '-30deg', '.6s'],
  ['31%', '11%', 7, 7, '#f7f5f2', '0deg', '1.2s'],
  ['77%', '12%', 8, 14, '#0e6593', '40deg', '.3s'],
  ['88%', '20%', 6, 11, '#f9eb50', '-12deg', '1.6s'],
  ['69%', '26%', 6, 6, '#a7c4bc', '0deg', '.9s'],
  ['10%', '36%', 7, 12, '#e0b45a', '60deg', '2s'],
  ['90%', '39%', 7, 12, '#f7f5f2', '-50deg', '1.1s'],
  ['51%', '9%', 6, 10, '#e0b45a', '-8deg', '1.8s'],
];

/** Confettis de l'écran « compte créé » (décoratifs). */
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.map(([left, top, w, h, color, r, delay]) => (
        <span
          key={`${left}${top}`}
          className="login-confetti absolute"
          style={
            {
              left,
              top,
              width: w,
              height: h,
              background: color,
              borderRadius: w === h ? '50%' : 2,
              animationDelay: delay,
              '--r': r,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
