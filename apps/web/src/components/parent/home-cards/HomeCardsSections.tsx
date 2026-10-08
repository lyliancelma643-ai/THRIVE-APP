'use client';

// Guide parent et primitives de mise en page (Section, Disclosure) des cartes.

import type { ReactNode } from 'react';
import { DECKS, getCard, type Deck } from '@/lib/home-cards';
import {
  CLOSING,
  DECK_ROW,
  HOW_IT_WORKS,
  PARENT_ROLE,
  RULES,
  RULES_INTRO,
  THEMES,
  THEMES_INTRO,
  TOP_FIVE,
  WELCOME,
  WHY_IT_WORKS,
} from '@/lib/home-cards/guide';
import { InlineMd } from './InlineMd';

export function Guide({ deck }: { deck: Deck | null }) {
  return (
    <Section title="Le guide" intro="Tout ce qu'il faut savoir, en deux minutes de lecture.">
      <Disclosure title="Les 3 seules règles" defaultOpen>
        <p className="text-[15px] leading-[1.55] text-soft">{RULES_INTRO}</p>
        <ol className="mt-3 space-y-3">
          {RULES.map((r, i) => (
            <li key={r.title} className="flex gap-3">
              <span className="font-display text-[20px] font-semibold text-accent-ink leading-none mt-0.5">{i + 1}.</span>
              <div>
                <p className="font-semibold text-night-ink text-[15px]"><InlineMd text={r.title} /></p>
                <p className="text-[15px] leading-[1.55] text-body mt-0.5"><InlineMd text={r.text} /></p>
              </div>
            </li>
          ))}
        </ol>
      </Disclosure>

      <Disclosure title="Comment ça marche">
        <ol className="space-y-3">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.title} className="text-[15px] leading-[1.55] text-body">
              <span className="font-semibold text-night-ink">{i + 1}. <InlineMd text={s.title} /></span>{' '}
              {s.text ? (
                <InlineMd text={s.text} />
              ) : deck ? (
                <InlineMd text={`Paquet ${deck}, ${DECK_ROW[deck].age} : ${DECK_ROW[deck].text}`} />
              ) : null}
            </li>
          ))}
        </ol>
      </Disclosure>

      {deck && (
        <Disclosure title={`Votre paquet — ${DECKS[deck].label.toLowerCase()}`}>
          <p className="font-semibold text-night-ink text-[15px]">{DECKS[deck].tagline}</p>
          <div className="mt-2 space-y-2.5 text-[15px] leading-[1.55] text-body">
            {DECKS[deck].intro.map((p) => (
              <p key={p}><InlineMd text={p} /></p>
            ))}
          </div>
        </Disclosure>
      )}

      {deck && (
        <Disclosure title="Si vous ne deviez en faire que cinq">
          <ol className="space-y-1.5 text-[15px] text-body">
            {TOP_FIVE[deck].map((id, i) => (
              <li key={id}>
                {i + 1}. <InlineMd text={getCard(id)!.title} />{' '}
                <span className="text-faint">· séance {getCard(id)!.session}</span>
              </li>
            ))}
          </ol>
        </Disclosure>
      )}

      <Disclosure title={WHY_IT_WORKS.title}>
        <div className="space-y-2.5 text-[15px] leading-[1.55] text-body">
          {WHY_IT_WORKS.paragraphs.map((p) => <p key={p}><InlineMd text={p} /></p>)}
          <ul className="list-disc pl-5 space-y-1">
            {WHY_IT_WORKS.list!.map((l) => <li key={l}><InlineMd text={l} /></li>)}
          </ul>
          {WHY_IT_WORKS.after!.map((p) => <p key={p}><InlineMd text={p} /></p>)}
        </div>
      </Disclosure>

      <Disclosure title="Les 8 thèmes de la méthode">
        <p className="text-[15px] leading-[1.55] text-soft">{THEMES_INTRO}</p>
        <ol className="mt-3 space-y-3">
          {THEMES.map((t, i) => (
            <li key={t.title} className="text-[15px] leading-[1.55] text-body">
              <p className="font-semibold text-night-ink">
                {i + 1}. {t.title} <span className="font-normal italic text-soft">({t.science})</span>
              </p>
              <p className="mt-0.5"><InlineMd text={t.text} /></p>
            </li>
          ))}
        </ol>
      </Disclosure>

      <Disclosure title={PARENT_ROLE.title}>
        <p className="text-[15px] text-body">{PARENT_ROLE.intro}</p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-[15px] text-body">
          {PARENT_ROLE.list.map((l) => <li key={l}>{l}</li>)}
        </ul>
        <p className="text-[15px] leading-[1.55] text-body mt-2.5">{PARENT_ROLE.outro}</p>
      </Disclosure>

      <Disclosure title="Trois choses, pour finir">
        <div className="space-y-2.5 text-[15px] leading-[1.55] text-body">
          {CLOSING.map((c) => (
            <p key={c.title}>
              <strong className="font-semibold text-night-ink">{c.title}</strong>
              {c.text.startsWith(',') ? '' : ' '}
              {c.text}
            </p>
          ))}
        </div>
      </Disclosure>

      <Disclosure title="Relire le mot de bienvenue">
        <div className="space-y-2.5 text-[15px] leading-[1.55] text-body">
          {WELCOME.paragraphs.map((p) => <p key={p}><InlineMd text={p} /></p>)}
        </div>
      </Disclosure>
    </Section>
  );
}

// ── Primitives de mise en page ───────────────────────────────────────────────

export function Section({
  eyebrow,
  title,
  intro,
  footer,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  footer?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-9 first:mt-2">
      {eyebrow && <p className="nc-eyebrow mb-1">{eyebrow}</p>}
      <h2 className="font-display text-[22px] font-semibold text-night-ink leading-snug">{title}</h2>
      {intro && <p className="text-[14px] leading-[1.5] text-soft mt-1"><InlineMd text={intro} /></p>}
      <div className="mt-3 space-y-2">{children}</div>
      {footer && <p className="text-[13px] leading-[1.5] text-faint mt-3"><InlineMd text={footer} /></p>}
    </section>
  );
}

export function Disclosure({
  title,
  meta,
  defaultOpen,
  children,
}: {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="nc-row group" open={defaultOpen}>
      <summary className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer select-none min-h-[52px]">
        <span className="text-[15px] font-semibold text-night-ink min-w-0">{title}</span>
        {meta && <span className="ml-auto text-xs text-faint shrink-0">{meta}</span>}
        <span aria-hidden className="text-faint text-lg leading-none transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
