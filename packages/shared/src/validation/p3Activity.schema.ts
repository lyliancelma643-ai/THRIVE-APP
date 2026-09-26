import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// P3 « Le moment qui compte » — schéma Zod des fiches d'activité.
// Source de vérité : apps/web/src/content/p3-moments/semaine-XX.md (39 fiches cœur),
// complements.md (compléments « Pour aller plus loin ») et bonus.md (hors séance).
// Ce schéma valide le JSON généré (apps/web/src/lib/p3-moments/activities.generated.json)
// et toute future source (CMS, import CSV) avant qu'une fiche n'atteigne l'app.
// ─────────────────────────────────────────────────────────────────────────────

export const PillarCodeSchema = z.enum(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
export const AgeBandSchema = z.enum(['8-11', '12-14', '15-17']);
export const DurationSchema = z.union([z.literal(10), z.literal(20), z.literal(30)]);
export const PlaceSchema = z.enum(['maison', 'exterieur', 'voiture', 'partout']);
export const ContentStatusSchema = z.enum(['brouillon', 'revu', 'publie']);

const wordCount = (s: string) => s.replace(/[«»"“”.,!?:;…—–-]/g, ' ').split(/\s+/).filter(Boolean).length;

export const VisualIdSchema = z.enum(['emotions', 'thermometre', 'colonnes', 'escalier', 'carte', 'sens', 'endroits', 'outils']);

const oneQuestion = (s: string) => (s.match(/\?/g) ?? []).length <= 1;

export const StepGuideSchema = z.object({
  beats: z
    .array(
      z.object({
        kind: z.enum(['faire', 'dire']),
        text: z.string().min(2).refine(oneQuestion, 'une question à la fois'),
      }),
    )
    .min(1)
    .max(8),
  help: z.string().min(3).nullable(),
  timer: z
    .object({
      rounds: z.number().int().min(1).max(12),
      phases: z
        .array(
          z.object({
            tone: z.enum(['action', 'tension', 'detente', 'inspire', 'garde', 'expire', 'silence']),
            label: z.string().min(1),
            seconds: z.number().int().min(1).max(600),
          }),
        )
        .min(1),
    })
    .nullable(),
  visual: VisualIdSchema.nullable(),
});

export const P3WeekSchema = z.object({
  week: z.number().int().min(1).max(13),
  title: z.string().min(3),
  phase: z.enum(['ANCRER', 'DEVELOPPER', 'INTEGRER']),
  session_source: z.string().min(3),
  action: z.string().min(1),
  skill: z.string().min(3),
  pillars: z.array(PillarCodeSchema).min(1),
  opening_line: z.string().min(3),
  transfer: z.boolean(),
  unlocks: z.enum(['fiche_identite', 'bilan_mi_parcours', 'boite_a_outils', 'certificat', 'lettre_un_an']).nullable(),
  foundation: z.string().min(10),
  intro: z.array(z.string().min(3)).min(1),
  status: ContentStatusSchema,
});

export const ProgrammeRoleSchema = z.enum(['coeur', 'complement', 'bonus']);

export const P3ActivitySchema = z
  .object({
    id: z.string().regex(/^(ACT-(0[1-9]|1[0-3])0[1-9]|BON-\d{2})$/),
    programme: ProgrammeRoleSchema,
    week: z.number().int().min(1).max(13).nullable(),
    rank: z.number().int().min(1).max(99),
    role: z.enum(['decouvrir', 'pratiquer', 'transferer', 'ancrer', 'bonus']),
    phase: z.enum(['ANCRER', 'DEVELOPPER', 'INTEGRER']).nullable(),
    after: z.string().regex(/^ACT-(0[1-9]|1[0-3])0[1-3]$/).nullable(),
    available_from_week: z.number().int().min(1).max(13).nullable(),
    participants: z.string().min(3).nullable(),
    safety: z.string().min(10).nullable(),
    title: z.string().min(2).max(60),
    subtitle: z.string().regex(/^(Séance \d{1,2}|Bonus) · .+/),
    objective: z.string().min(10).max(140),
    durations: z.array(DurationSchema).min(1),
    duration_type: z.enum(['modulaire', 'native']),
    base_duration: DurationSchema,
    age_bands: z.array(AgeBandSchema).min(1),
    places: z.array(PlaceSchema).min(1),
    car_ok: z.boolean(),
    materials: z.array(z.string()),
    specific_materials: z.boolean(),
    parent_energy: z.enum(['basse', 'moyenne', 'haute']),
    movement: z.enum(['assis', 'debout', 'actif']),
    moments: z.array(z.enum(['matin', 'apres-ecole', 'soir', 'week-end', 'indifferent'])).min(1),
    child_moods: z.array(z.enum(['agite', 'fatigue', 'renfrogne', 'disponible', 'indifferent'])).min(1),
    anti_refusal: z.boolean(),
    pillar_main: PillarCodeSchema,
    pillars_secondary: z.array(PillarCodeSchema).max(2),
    capture: z
      .object({
        kind: z.enum(['forces', 'choix', 'reve', 'objectif', 'emotion', 'outil', 'mot', 'personnes', 'progres', 'phrase', 'lettre']),
        label: z.string().min(3),
      })
      .nullable(),
    origin: z.string().min(3),
    opener: z.string().regex(/^«.+»$/),
    opener_is_dynamic: z.boolean(),
    steps: z.array(z.string().min(3)).min(3).max(5),
    screen_steps: z.array(z.string().refine((s) => wordCount(s) <= 10, '≤ 10 mots à l’écran')).min(3).max(5),
    guide: z.array(StepGuideSchema).min(3).max(5),
    visuals: z.array(VisualIdSchema),
    donts: z.tuple([z.string(), z.string(), z.string()]),
    what_you_will_see: z.string().min(10),
    debrief: z
      .array(
        z.object({
          kind: z.enum(['vecu', 'fait', 'ailleurs']),
          question: z.string().min(5).refine(oneQuestion, 'une question à la fois'),
        }),
      )
      .min(1)
      .max(5),
    closing: z.string().regex(/^«.+»$/),
    why_one_line: z.string().min(10),
    why_detail: z.string().min(20),
    method_ref: z.string().min(3),
    sources: z.array(z.object({ citation: z.string().min(5), level: z.enum(['A', 'B', 'C']) })).min(1),
    extensions: z.array(
      z.object({
        adds_to: z.union([z.literal(20), z.literal(30)]),
        kind: z.enum(['approfondir', 'ancrer', 'transferer']),
        text: z.string().min(10),
      }),
    ),
    variants: z
      .array(
        z.object({
          band: z.enum(['12-14', '15-17']),
          opener: z.string().regex(/^«.+»$/).nullable(),
          text: z.string().min(10),
        }),
      )
      .length(2),
    why_it_fails: z.string().min(10),
    status: ContentStatusSchema,
  })
  .superRefine((a, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${a.id} : ${message}` });
    if (a.programme === 'coeur') {
      if (!a.id.startsWith('ACT-') || a.week === null || a.rank > 3 || a.after !== null) issue('fiche cœur = ACT-SS01 à 03, avec sa semaine');
    } else if (a.programme === 'complement') {
      if (!a.id.startsWith('ACT-') || a.week === null || a.rank < 4) issue('complément = ACT-SS04 et plus, avec sa semaine');
      if (!a.after || a.after.slice(4, 6) !== a.id.slice(4, 6)) issue('un complément suit une fiche cœur de sa semaine');
    } else {
      if (!a.id.startsWith('BON-') || a.week !== null || a.phase !== null || a.role !== 'bonus') issue('bonus = BON-NN, sans semaine');
      if (a.available_from_week === null) issue('un bonus dit à partir de quelle semaine il est proposé');
    }
    if (a.steps.length !== a.screen_steps.length || a.steps.length !== a.guide.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${a.id} : écrans ≠ étapes` });
    }
    if (a.extensions.length !== a.durations.length - 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${a.id} : une extension par palier de 10 min` });
    }
    if (a.car_ok && a.materials.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${a.id} : voiture = aucun matériel` });
    }
    if (a.opener_is_dynamic !== a.opener.includes('{duree}')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${a.id} : drapeau d'amorce dynamique incohérent` });
    }
  });

export const P3ContentSchema = z
  .object({
    version: z.string(),
    weeks: z.array(P3WeekSchema).length(13),
    activities: z.array(P3ActivitySchema),
  })
  .superRefine((c, ctx) => {
    const ids = c.activities.map((a) => a.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'identifiants de fiche en double' });
    const core = c.activities.filter((a) => a.programme === 'coeur');
    if (core.length !== 39) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${core.length} fiches cœur (39 attendues)` });
    for (const a of c.activities) {
      if (a.after && !core.some((x) => x.id === a.after)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${a.id} : « après » vise une fiche cœur inconnue (${a.after})` });
      }
    }
  });

export type TP3Week = z.infer<typeof P3WeekSchema>;
export type TP3Activity = z.infer<typeof P3ActivitySchema>;
export type TP3Content = z.infer<typeof P3ContentSchema>;
