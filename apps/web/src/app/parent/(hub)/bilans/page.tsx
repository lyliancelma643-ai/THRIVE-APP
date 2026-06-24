'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';

// Niveaux & acteurs conservés en donnée (protocole §1.4) — non affichés sur la carte
type Level = 'A' | 'B' | 'C';
type Actor = 'Jeune' | 'Coach' | 'Parent' | 'Mixte';

type Support = {
  title: string;
  sessions: string[];
  actorLabel: string;
  actor: Actor;
  level: Level;
  anchor: string;
  desc: string;
};

// Les 11 supports / outils du parcours THRIVE (protocole §8.5 + tableau de synthèse)
const SUPPORTS: Support[] = [
  {
    title: 'Fiche Identité Athlète',
    sessions: ['S1'],
    actorLabel: 'Coach + Jeune ensemble',
    actor: 'Mixte',
    level: 'B',
    anchor: 'Forces VIA · Alliance SDT',
    desc: "Le jeune décrit son histoire sportive, nomme 2–3 forces VIA que le coach lui a reflétées, et formule son rêve de saison. Document de référence pour personnaliser les séances suivantes.",
  },
  {
    title: 'Contrat de confiance',
    sessions: ['S1'],
    actorLabel: 'Jeune + Parent + Coach',
    actor: 'Mixte',
    level: 'A',
    anchor: 'SDT Connexion · Consentement éclairé',
    desc: "Engagement co-signé par le jeune, le parent et le coach : cadre, confidentialité et consentement éclairé. Pose l'alliance et le lien de confiance du programme.",
  },
  {
    title: 'LSSS (Cronin & Allen, 2017)',
    sessions: ['S1', 'S7', 'S13'],
    actorLabel: 'Jeune (auto-évaluation)',
    actor: 'Jeune',
    level: 'A',
    anchor: 'Life Skills Scale for Sport (validée)',
    desc: "Auto-évaluation validée des compétences de vie, administrée en S1, S7 et S13 pour mesurer objectivement la progression du jeune.",
  },
  {
    title: 'Fiche Objectif THRIVE',
    sessions: ['S2'],
    actorLabel: 'Jeune guidé par le coach',
    actor: 'Jeune',
    level: 'A',
    anchor: 'SMART · AGT · SDT compétence',
    desc: "Un objectif technique SMART + un objectif de life skill pour la saison, écrits par le jeune, accompagnés de « ce qui dépend uniquement de moi » : 3 actions concrètes.",
  },
  {
    title: 'Roue des Émotions Sportives THRIVE',
    sessions: ['S4', 'S5'],
    actorLabel: 'Jeune',
    actor: 'Jeune',
    level: 'B',
    anchor: 'Régulation émotionnelle · SDT',
    desc: "Le jeune identifie et nomme ses émotions en contexte sportif pour développer sa capacité de régulation émotionnelle.",
  },
  {
    title: 'Routine pré-tir THRIVE',
    sessions: ['S6'],
    actorLabel: 'Jeune autonome',
    actor: 'Jeune',
    level: 'A',
    anchor: 'Routines de performance · Self-Efficacy',
    desc: "Fiche plastifiée : une routine de pré-performance personnelle, répétable sous pression et exécutée en autonomie par le jeune.",
  },
  {
    title: 'Carte Boîte à Outils THRIVE',
    sessions: ['S11'],
    actorLabel: 'Jeune entièrement',
    actor: 'Jeune',
    level: 'A',
    anchor: 'Transfert conscient (Pierce et al., 2017)',
    desc: "Format poche : le jeune liste lui-même ses 6 outils THRIVE et, pour chacun, le contexte hors-sport où il l'utilise. Elle ne le quitte plus après S11.",
  },
  {
    title: 'Lettre à moi-même dans 1 an',
    sessions: ['S13'],
    actorLabel: 'Jeune (dicte ou écrit)',
    actor: 'Jeune',
    level: 'B',
    anchor: 'Identité positive · SDT',
    desc: "Le jeune écrit une lettre à son futur lui-même, scellée et remise au parent, ouverte 12 mois plus tard. Consolide une identité positive tournée vers la croissance.",
  },
  {
    title: 'Certificat THRIVE',
    sessions: ['S13'],
    actorLabel: 'Coach (remis au jeune)',
    actor: 'Coach',
    level: 'C',
    anchor: 'Reconnaissance symbolique',
    desc: "Reconnaissance symbolique remise au jeune à la fin du programme, qui marque le chemin parcouru sur les 13 séances.",
  },
];

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

type CoachInfo = { first_name: string; last_name: string } | null;

export default function AthleteIdentityPage() {
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [coach, setCoach] = useState<CoachInfo>(null);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setCoach(null);
      setCompleted(0);
      setLoading(false);
      return;
    }
    const [sessionsRes, assignmentRes] = await Promise.all([
      supabase.from('sessions').select('status').eq('child_id', selectedChildId),
      supabase
        .from('coach_assignments')
        .select('coach_id, profiles:coach_id (first_name, last_name)')
        .eq('child_id', selectedChildId)
        .eq('is_active', true)
        .limit(1),
    ]);
    setCompleted((sessionsRes.data ?? []).filter((s: any) => s.status === 'COMPLETED').length);
    const assignment = (assignmentRes.data ?? [])[0] as any;
    const coachProfile = Array.isArray(assignment?.profiles)
      ? assignment.profiles[0]
      : assignment?.profiles;
    setCoach((coachProfile as CoachInfo) ?? null);
    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (!selectedChild) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-2xl text-sun">
          ◈
        </div>
        <h2 className="font-display text-2xl font-semibold text-white mb-3">Aucun profil enfant</h2>
        <p className="text-white/55">
          Ajoute un enfant pour découvrir sa carte d&apos;identité d&apos;athlète THRIVE.
        </p>
      </div>
    );
  }

  const age = ageFromDob(selectedChild.date_of_birth);
  const initials =
    `${selectedChild.first_name?.[0] ?? ''}${selectedChild.last_name?.[0] ?? ''}`.toUpperCase();
  const pct = Math.round((completed / 13) * 100);

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-3xl font-semibold text-white mb-2">Carte d&apos;identité</h1>
      <p className="text-white/55 mb-8">
        Le passeport THRIVE de {selectedChild.first_name} : son identité d&apos;athlète et tous les
        supports qui jalonnent son parcours de 13 séances.
      </p>

      {/* Carte de membre — en-tête premium */}
      <div className="relative overflow-hidden rounded-3xl glass-navy ring-1 ring-white/10 p-6 md:p-8 mb-10">
        <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-sun/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            {selectedChild.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedChild.avatar_url}
                alt={selectedChild.first_name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover ring-2 ring-sun/40"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-navy-500 to-navy-800 ring-2 ring-sun/40 flex items-center justify-center font-display text-2xl font-bold text-white">
                {initials || '★'}
              </div>
            )}
          </div>

          {/* Identité */}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-sun/80">
              Athlète THRIVE
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-white leading-tight mt-0.5">
              {selectedChild.first_name} {selectedChild.last_name ?? ''}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-white/60">
              {age != null && <span>{age} ans</span>}
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sage" />
                Hockey sur glace
              </span>
              {coach && (
                <span>
                  Coach&nbsp;
                  <span className="text-white/85 font-medium">
                    {coach.first_name} {coach.last_name}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Progression */}
          <div className="sm:text-right sm:w-44 shrink-0">
            <div className="flex sm:justify-end items-baseline gap-1.5">
              <span className="font-display text-2xl font-bold text-sun tabular-nums">
                {loading ? '—' : `${completed}/13`}
              </span>
              <span className="text-xs text-white/45">séances</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sage to-sun transition-all duration-700"
                style={{ width: `${loading ? 0 : pct}%` }}
              />
            </div>
            <p className="text-[11px] text-white/40 mt-1.5">Programme complété</p>
          </div>
        </div>
      </div>

      {/* Parcours & supports */}
      <div className="mb-4">
        <h3 className="font-display text-xl font-semibold text-white">
          Parcours &amp; supports THRIVE
        </h3>
        <p className="text-sm text-white/50 mt-0.5">
          Les outils qui construisent l&apos;identité et l&apos;autonomie de{' '}
          {selectedChild.first_name}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {SUPPORTS.map((s) => (
          <SupportCard key={s.title} support={s} />
        ))}
      </div>
    </div>
  );
}

function SupportCard({ support }: { support: Support }) {
  return (
    <section className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-200 hover:border-sun/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-navy-900/40 motion-safe:hover:-translate-y-0.5">
      <h4 className="font-display text-base font-semibold text-white leading-tight mb-2 transition-colors group-hover:text-sun">
        {support.title}
      </h4>

      <p className="text-sm text-white/75 leading-relaxed mb-3">{support.desc}</p>

      <p className="text-[11px] text-white/40 pt-2 border-t border-white/10">
        <span className="uppercase tracking-wide">Ancrage</span> · {support.anchor}
      </p>
    </section>
  );
}
