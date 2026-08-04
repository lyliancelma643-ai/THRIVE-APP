// Deux habillages pour un seul moteur de messagerie.
//
//   • `night` : espace parent. Ne code plus « la nuit » en dur — il pointe sur
//     les tokens d'ambiance (globals.css), donc le même fil rend en Nuit calme
//     ou en Jour clair selon la bascule du header, sans une classe de plus.
//   • `light` : espaces coach et admin — fond crème, cartes blanches, navy.
//
// Les écrans ne composent jamais de classes à la main : ils passent un `tone`
// aux composants, qui piochent ici. Un changement de direction visuelle se fait
// donc à un seul endroit.

export type Tone = 'night' | 'light';

export type ToneTokens = {
  panel: string; // conteneur du fil
  divider: string; // filets internes
  title: string;
  subtitle: string;
  muted: string;
  bubbleMine: string;
  bubbleTheirs: string;
  metaMine: string;
  metaTheirs: string;
  daySeparator: string;
  input: string;
  sendButton: string;
  iconButton: string;
  rowIdle: string;
  rowActive: string;
  avatar: string;
  badge: string;
  skeleton: string;
};

export const TONES: Record<Tone, ToneTokens> = {
  night: {
    panel: 'bg-night-surface rounded-[22px]',
    divider: 'border-line',
    title: 'text-ink',
    subtitle: 'text-soft',
    muted: 'text-faint',
    // Bulles du design : entrante sur la surface, sortante en bleu profond la
    // nuit / bleu pâle le jour — jamais l'accent jaune, réservé aux actions.
    bubbleMine: 'rounded-[16px] rounded-br-[5px]',
    bubbleTheirs: 'rounded-[16px] rounded-bl-[5px]',
    metaMine: 'text-meta',
    metaTheirs: 'text-meta',
    daySeparator: 'text-soft',
    input: 'bg-field border border-line text-ink placeholder:text-faint focus:border-accent-line',
    sendButton: 'bg-accent text-accent-on hover:brightness-95',
    iconButton: 'border border-line2 text-body hover:bg-surface-sub hover:text-ink',
    rowIdle: 'hover:bg-surface-sub',
    rowActive: 'bg-chip',
    avatar: 'bg-brand text-white',
    badge: 'bg-accent text-accent-on',
    skeleton: 'bg-surface-sub',
  },
  light: {
    panel: 'bg-white rounded-3xl shadow-card',
    divider: 'border-slate-100',
    title: 'text-navy-900',
    subtitle: 'text-navy-600/60',
    muted: 'text-slate-400',
    bubbleMine: 'bg-navy-600 text-white rounded-[18px] rounded-br-[6px]',
    bubbleTheirs: 'bg-slate-100 text-slate-800 rounded-[18px] rounded-bl-[6px]',
    metaMine: 'text-white/65',
    metaTheirs: 'text-slate-400',
    daySeparator: 'text-slate-400',
    input:
      'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-navy-400',
    sendButton: 'bg-navy-600 text-white hover:bg-navy-700',
    iconButton: 'border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-navy-700',
    rowIdle: 'bg-white hover:bg-slate-50',
    rowActive: 'bg-white ring-2 ring-navy-400',
    avatar: 'bg-navy-600 text-white',
    badge: 'bg-navy-600 text-white',
    skeleton: 'bg-slate-100',
  },
};

/** Fonds de bulle du design (variables, donc suivent l'ambiance). */
export const BUBBLE_STYLE = {
  mine: { background: 'var(--bub-out)', color: 'var(--bub-out-text)', boxShadow: 'var(--bub-shadow)' },
  theirs: { background: 'var(--bub-in)', color: 'var(--text)', boxShadow: 'var(--bub-shadow)' },
} as const;
