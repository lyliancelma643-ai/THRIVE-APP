// Pages d'aide (K4 « Quand il dit non », K5 « Quand consulter ») : logique pure, sans React.
// Les textes viennent du module partagé (lib/p3 → PAGE_NON, PAGE_CONSULTER) : jamais recopiés ici.
import { PAGE_CONSULTER, PAGE_NON, pickTonight, type AgeBand, type Moment, type P3Activity } from '../../lib/p3';

// ── K4 · Quand il dit non ───────────────────────────────────────────────────

type AgeBlock = (typeof PAGE_NON.byAge)[number];

/**
 * La tranche d'âge de l'enfant d'abord, les autres ensuite (repliées).
 * Tranche inconnue : aucun bloc mis en avant, les trois restent dans l'ordre du texte.
 */
export function ageBlocks(band: AgeBand | null | undefined): { mine: AgeBlock | null; others: AgeBlock[] } {
  const mine = PAGE_NON.byAge.find((b) => b.band === band) ?? null;
  return { mine, others: PAGE_NON.byAge.filter((b) => b !== mine) };
}

/**
 * La fiche anti-refus : même appel que le web (`pickTonight` avec 2 refus, 10 min, à la maison). Quand la tranche
 * d'âge est connue, la sélection se limite aux fiches de cette tranche (comme l'accueil Maison du mobile).
 */
export function softActivity(input: {
  firstName: string;
  band: AgeBand | null;
  moments: Moment[];
  pool: P3Activity[];
  now?: Date;
  refusals?: number;
}): P3Activity | null {
  const pool = input.band ? input.pool.filter((a) => a.age_bands.includes(input.band as AgeBand)) : input.pool;
  const pick = pickTonight({
    firstName: input.firstName,
    band: input.band ?? '8-11',
    declaredDuration: 10,
    place: 'maison',
    parentEnergy: null,
    childMood: null,
    moments: input.moments,
    consecutiveRefusals: input.refusals ?? 2,
    now: input.now ?? new Date(),
    pool,
  });
  return pick?.activity ?? null;
}

// ── K5 · Quand consulter ────────────────────────────────────────────────────

export type LinkSegment =
  | { kind: 'text'; text: string }
  | { kind: 'tel' | 'sms'; text: string; value: string };

// Même reconnaissance que la page web : 9-8-8, 9-1-1, 811, 1 800 …, 514 600-1002, 686868.
const NUMBER_RE = /(9-8-8|9-1-1|811|1 800 [\d-]+|\d{3} \d{3}-\d{4}|686868)/g;

/** Découpe un texte de PAGE_CONSULTER en morceaux de texte et numéros appelables (tel:) ou textables (sms:). */
export function linkify(text: string): LinkSegment[] {
  const parts = text.split(NUMBER_RE);
  const out: LinkSegment[] = [];
  parts.forEach((p, i) => {
    if (p === '') return;
    if (i % 2 === 0) {
      out.push({ kind: 'text', text: p });
      return;
    }
    const sms = /texto\s*$|au\s*$/.test(parts[i - 1] ?? '');
    out.push({ kind: sms ? 'sms' : 'tel', text: p, value: p.replace(/\D/g, '') });
  });
  return out;
}

/** Le numéro de crise, lu dans le texte « Sans attendre » (jamais saisi à la main). */
export function crisisNumber(): { label: string; value: string } {
  const seg = linkify(PAGE_CONSULTER.urgent.text).find((s) => s.kind === 'tel' && s.text === '9-8-8');
  return seg && seg.kind !== 'text' ? { label: seg.text, value: seg.value } : { label: '9-8-8', value: '988' };
}

export const telUrl = (value: string) => `tel:${value}`;
export const smsUrl = (value: string) => `sms:${value}`;

/** Les textes à afficher de la page K5. Le statut `A_VALIDER` et la `verifyNote` n'en font pas partie (CHECKLIST_TOI.md). */
export function consultPage() {
  const c = PAGE_CONSULTER;
  const crisis = crisisNumber();
  return {
    title: c.title,
    intro: c.intro,
    urgent: {
      title: c.urgent.title,
      text: c.urgent.text,
      callLabel: `Appeler ${crisis.label}`,
      textLabel: `Texto ${crisis.label}`,
      callUrl: telUrl(crisis.value),
      textUrl: smsUrl(crisis.value),
    },
    signals: { title: c.signals.title, items: c.signals.items },
    whoToCall: { title: c.whoToCall.title, items: c.whoToCall.items },
    inApp: c.inApp,
  };
}
