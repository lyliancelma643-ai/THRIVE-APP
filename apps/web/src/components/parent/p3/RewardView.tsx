'use client';

// ─────────────────────────────────────────────────────────────────────────────
// E7 — Les objets symboliques, assemblés depuis le carnet au moment où ils sont
// gagnés (payload figé dans p3_rewards). Imprimables ; « Enregistrer en image »
// dessine la carte sur un canvas (aucune dépendance ajoutée — R9).
// La lettre scellée n'expose que ses dates, jamais son contenu (R12).
// ─────────────────────────────────────────────────────────────────────────────

import { REWARDS, type RewardId } from '@/lib/p3-moments';
import { BILAN_4_SEMAINES } from '@/lib/p3-moments/guide';
import { fill, formatFullDate, inOneYear } from '@/lib/p3-moments/app';

type Block = { label: string; lines: string[] };

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : (x as { text?: string })?.text ?? '')).filter(Boolean) : typeof v === 'string' && v ? [v] : [];

export function rewardTitle(id: RewardId, firstName: string): string {
  switch (id) {
    case 'fiche_identite':
      return `La Fiche Identité de ${firstName}`;
    case 'bilan_mi_parcours':
      return `Six semaines avec ${firstName}`;
    case 'boite_a_outils':
      return `La Boîte à Outils de ${firstName}`;
    case 'certificat':
      return 'Certificat THRIVE Maison';
    default:
      return fill(REWARDS.find((r) => r.id === id)?.label ?? '', { prenom: firstName });
  }
}

function blocksFor(id: RewardId, payload: Record<string, unknown> | null): Block[] {
  const p = payload ?? {};
  switch (id) {
    case 'fiche_identite':
      return [
        { label: 'Ses trois forces', lines: list(p.forces) },
        { label: 'Ce qu’il choisit quand il choisit', lines: list(p.choix) },
        { label: 'Son rêve de l’année, dans ses mots', lines: list(p.reve) },
      ];
    case 'bilan_mi_parcours':
      return [
        { label: 'Son podium', lines: list(p.podium) },
        { label: 'Son objectif, ajusté', lines: list(p.objectif) },
        { label: 'Ce que vous avez vu changer', lines: list(p.vu_par_le_parent) },
      ];
    case 'boite_a_outils':
      return [{ label: 'Ses outils, nommés par lui', lines: list(p.outils) }];
    default:
      return [];
  }
}

/** Dessine la carte sur un canvas et la propose en PNG. Couleurs de la charte (fond crème, marine). */
function downloadImage(title: string, blocks: Block[], footer: string) {
  const W = 1080;
  const pad = 80;
  const canvas = document.createElement('canvas');
  const c = canvas.getContext('2d');
  if (!c) return;
  const wrap = (text: string, font: string, max: number) => {
    c.font = font;
    const words = text.split(/\s+/);
    const out: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (c.measureText(test).width > max && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    if (line) out.push(line);
    return out;
  };
  const rows: { text: string; font: string; color: string; gap: number }[] = [];
  wrap(title, '600 64px Georgia, serif', W - pad * 2).forEach((t) => rows.push({ text: t, font: '600 64px Georgia, serif', color: '#022539', gap: 78 }));
  rows.push({ text: '', font: '', color: '', gap: 30 });
  for (const b of blocks) {
    rows.push({ text: b.label.toUpperCase(), font: '700 26px system-ui, sans-serif', color: '#004E7A', gap: 50 });
    for (const l of b.lines.length ? b.lines : ['—'])
      wrap(l, '36px system-ui, sans-serif', W - pad * 2).forEach((t) => rows.push({ text: t, font: '36px system-ui, sans-serif', color: '#022539', gap: 50 }));
    rows.push({ text: '', font: '', color: '', gap: 30 });
  }
  wrap(footer, 'italic 30px Georgia, serif', W - pad * 2).forEach((t) => rows.push({ text: t, font: 'italic 30px Georgia, serif', color: '#3c4a52', gap: 44 }));
  const H = pad * 2 + rows.reduce((h, r) => h + r.gap, 0);
  canvas.width = W;
  canvas.height = H;
  c.fillStyle = '#F7F5F2';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#F9EB50';
  c.fillRect(0, 0, W, 16);
  let y = pad;
  for (const r of rows) {
    y += r.gap;
    if (!r.text) continue;
    c.font = r.font;
    c.fillStyle = r.color;
    c.fillText(r.text, pad, y);
  }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png`;
  a.click();
}

function Actions({ title, blocks, footer }: { title: string; blocks: Block[]; footer: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="nc-pill min-h-[44px]">
        Imprimer
      </button>
      <button type="button" onClick={() => downloadImage(title, blocks, footer)} className="nc-pill min-h-[44px]">
        Enregistrer en image
      </button>
    </div>
  );
}

/** À l'impression : seule la carte sort (le chrome du hub est masqué). */
const PRINT_CSS = `@media print { header, nav, .p3-noprint { display: none !important; } body { background: #fff !important; } }`;

export function RewardView({
  id,
  payload,
  earnedAt,
  firstName,
  compact = false,
  bilan4Pending = false,
}: {
  id: RewardId;
  payload: Record<string, unknown> | null;
  earnedAt: string;
  firstName: string;
  compact?: boolean;
  /** Bilan de mi-parcours : rappeler les 3 questions à 4 semaines si elles n'ont pas été remplies. */
  bilan4Pending?: boolean;
}) {
  const title = rewardTitle(id, firstName);

  if (id === 'lettre_un_an') {
    const sealed = typeof payload?.sealed_at === 'string' ? payload.sealed_at : null;
    return (
      <div className="nc-card">
        <p className="nc-eyebrow">La lettre</p>
        <p className="mt-2 text-[17px] leading-[1.5] text-ink">
          {sealed
            ? `Lettre scellée le ${formatFullDate(sealed)}. Elle vous reviendra le ${formatFullDate(inOneYear(new Date(sealed)))}.`
            : `La lettre de ${firstName} se garde sur papier, dans son enveloppe fermée.`}
        </p>
      </div>
    );
  }

  if (id === 'certificat') {
    const s1 = list(payload?.forces_s1);
    const s13 = list(payload?.forces_s13);
    const keep = list(payload?.a_garder);
    const blocks: Block[] = [
      { label: 'Ses forces en semaine 1', lines: s1 },
      { label: 'Ses forces en semaine 13', lines: s13 },
      ...(keep.length ? [{ label: 'Ce qu’il garde', lines: keep }] : []),
    ];
    const footer = `${firstName} a terminé les 13 semaines du programme THRIVE Maison · ${formatFullDate(earnedAt)}`;
    return (
      <div>
        <style>{PRINT_CSS}</style>
        <div className="nc-card ring-1 ring-accent-line text-center md:p-10">
          <p className="nc-eyebrow">{title}</p>
          <p className="font-display text-[40px] md:text-[52px] font-semibold text-ink mt-3">{firstName}</p>
          <p className="mt-2 text-[17px] text-body">a terminé les 13 semaines du programme THRIVE Maison</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 text-left">
            {blocks.slice(0, 2).map((b) => (
              <div key={b.label} className="nc-row p-4">
                <p className="nc-eyebrow">{b.label}</p>
                <ul className="mt-2 space-y-1 text-[16px] text-ink">
                  {b.lines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {keep.length > 0 && <p className="mt-6 font-display text-[20px] text-ink">« {keep[0]} »</p>}
          <p className="mt-6 text-[14px] text-soft">{formatFullDate(earnedAt)}</p>
          {/* TODO(facturation) : l'application réelle du « 1 mois offert » dépend de la facturation P3, hors périmètre. */}
          <p className="mt-4 inline-block rounded-full bg-accent text-accent-on px-4 py-1.5 text-[14px] font-bold">
            {REWARDS.find((r) => r.id === 'certificat')?.bonus}
          </p>
        </div>
        {!compact && <Actions title={title} blocks={blocks} footer={footer} />}
      </div>
    );
  }

  const blocks = blocksFor(id, payload);

  if (id === 'boite_a_outils') {
    // Format carte de portefeuille imprimable (85 × 55 mm), recto / verso.
    const tools = blocks[0].lines;
    const recto = tools.slice(0, 3);
    const verso = tools.slice(3, 8);
    const card = 'nc-card ring-1 ring-accent-line aspect-[85/55] w-full max-w-[340px] print:w-[85mm] print:h-[55mm] print:max-w-none flex flex-col';
    return (
      <div>
        <style>{PRINT_CSS}</style>
        <div className="flex flex-wrap gap-4">
          <div className={card}>
            <p className="nc-eyebrow">{title}</p>
            <ul className="mt-2 space-y-1 text-[15px] text-ink">
              {recto.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
          {verso.length > 0 && (
            <div className={card}>
              <p className="nc-eyebrow">Et aussi</p>
              <ul className="mt-2 space-y-1 text-[14px] text-body">
                {verso.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {!compact && <Actions title={title} blocks={blocks} footer={formatFullDate(earnedAt)} />}
      </div>
    );
  }

  const footer = id === 'fiche_identite' ? 'À garder. On y revient en semaine 13.' : formatFullDate(earnedAt);
  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="nc-card ring-1 ring-accent-line md:p-8">
        <p className="font-display text-[26px] md:text-[32px] font-semibold text-ink">{title}</p>
        <div className="mt-5 space-y-5">
          {blocks.map((b) => (
            <div key={b.label}>
              <p className="nc-eyebrow">{b.label}</p>
              {b.lines.length ? (
                <ul className="mt-2 space-y-1.5 text-[17px] leading-[1.45] text-ink">
                  {b.lines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[15px] text-faint">Rien de noté ici.</p>
              )}
            </div>
          ))}
          {id === 'bilan_mi_parcours' && bilan4Pending && !compact && (
            <div>
              <p className="nc-eyebrow">{fill(BILAN_4_SEMAINES.title, { prenom: firstName })}</p>
              <ul className="mt-2 space-y-1.5 text-[15px] text-body">
                {BILAN_4_SEMAINES.questions.map((q) => (
                  <li key={q}>{fill(q, { prenom: firstName })}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <p className="mt-6 text-[15px] italic text-soft">{footer}</p>
      </div>
      {!compact && <Actions title={title} blocks={blocks} footer={footer} />}
    </div>
  );
}
