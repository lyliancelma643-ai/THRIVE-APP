// Questionnaire de l'enfant (W) : modèle PUR du parcours « un lien à jeton, aucun compte ». Mêmes RPC que la page web
// `/q/[token]` (questionnaire_get, questionnaire_submit, SECURITY DEFINER, accessibles sans session) ; le verrou « 1 test
// par séance » (migrations 047/053) reste côté serveur. Aucune question n'est écrite ici : elles viennent de la base.

export type QuestionnaireLang = 'fr' | 'en';
export type QuestionnaireKind = 'LSSS' | 'PERMA';

export type QuestionnaireItem = { id: string; group_key: string; group_label: string; prompt: string; sort_order: number };

/** Réponse de `questionnaire_get` (mêmes champs que la page web). */
export type QuestionnaireLoad = {
  questionnaire_id?: string;
  kind?: QuestionnaireKind;
  lang?: QuestionnaireLang;
  session_number?: number | null;
  child_first_name?: string;
  title?: string;
  description?: string;
  status?: string;
  completed?: boolean;
  items?: QuestionnaireItem[];
  error?: string;
};

/**
 * Échelles de réponse, copie conforme de la page web (EPOCH = fréquence, Kern et al. 2016 ; LSSS = accord).
 * Une évolution se fait aux deux endroits ; le test `questionnaireEnfant.test.ts` verrouille la forme (5 libellés).
 */
export const SCALES: Record<QuestionnaireKind, Record<QuestionnaireLang, readonly [string, string, string, string, string]>> = {
  PERMA: {
    fr: ['Presque jamais', 'Parfois', 'Souvent', 'Très souvent', 'Presque toujours'],
    en: ['Almost never', 'Sometimes', 'Often', 'Very often', 'Almost always'],
  },
  LSSS: {
    fr: ['Pas du tout', 'Un peu', 'Moyennement', 'Beaucoup', 'Tout à fait'],
    en: ['Not at all', 'A little', 'Somewhat', 'A lot', 'Completely'],
  },
};

export type QuestionnaireCopy = {
  loading: string;
  done: string;
  oops: string;
  thanks: string;
  already: string;
  expired: string;
  invalid: string;
  network: string;
  home: string;
  send: string;
  sending: string;
  remaining: (n: number) => string;
  incomplete: string;
  alreadyShort: string;
  genericErr: string;
  prev: string;
  review: string;
};

export const COPY: Record<QuestionnaireLang, QuestionnaireCopy> = {
  fr: {
    loading: 'Chargement…',
    done: 'C’est fait',
    oops: 'Oups',
    thanks: 'Merci ! Tes réponses ont bien été enregistrées.',
    already: 'Ce questionnaire a déjà été complété. Merci !',
    expired: 'Ce lien a expiré. Demande un nouveau lien à ton coach.',
    invalid: 'Lien invalide ou introuvable.',
    network: 'La connexion est coupée. Vérifie ta connexion, puis réessaie.',
    home: 'Terminer',
    send: 'Envoyer mes réponses',
    sending: 'Envoi…',
    remaining: (n) => (n > 1 ? `Encore ${n} questions` : 'Encore 1 question'),
    incomplete: 'Merci de répondre à toutes les questions.',
    alreadyShort: 'Ce questionnaire a déjà été complété.',
    genericErr: 'Une erreur est survenue.',
    prev: 'Précédente',
    review: 'Tout est répondu !',
  },
  en: {
    loading: 'Loading…',
    done: 'All done',
    oops: 'Oops',
    thanks: 'Thank you! Your answers have been saved.',
    already: 'This questionnaire has already been completed. Thank you!',
    expired: 'This link has expired. Ask your coach for a new one.',
    invalid: 'Invalid or missing link.',
    network: 'The connection was lost. Check your connection, then try again.',
    home: 'Finish',
    send: 'Send my answers',
    sending: 'Sending…',
    remaining: (n) => (n > 1 ? `${n} questions left` : '1 question left'),
    incomplete: 'Please answer every question.',
    alreadyShort: 'This questionnaire has already been completed.',
    genericErr: 'Something went wrong.',
    prev: 'Previous',
    review: 'All answered!',
  },
};

/** Ordre d'affichage : par groupe (pilier EPOCH ou sous-échelle LSSS), l'ordre du serveur conservé dans chaque groupe. */
export function orderItems(items: readonly QuestionnaireItem[] | undefined): QuestionnaireItem[] {
  const map = new Map<string, QuestionnaireItem[]>();
  for (const it of items ?? []) {
    const arr = map.get(it.group_label) ?? [];
    arr.push(it);
    map.set(it.group_label, arr);
  }
  return Array.from(map.values()).flat();
}

export type Answers = Record<string, number>;

export function answeredCount(items: readonly QuestionnaireItem[], answers: Answers): number {
  return items.filter((it) => answers[it.id] !== undefined).length;
}

export const allAnswered = (items: readonly QuestionnaireItem[], answers: Answers): boolean =>
  items.length > 0 && answeredCount(items, answers) >= items.length;

/** Question à montrer après une réponse à `itemId` : la suivante sans réponse, sinon la première restante, sinon la fin (= total). */
export function nextIndex(items: readonly QuestionnaireItem[], answers: Answers, current: number, itemId: string): number {
  const after = items.findIndex((it, j) => j > current && answers[it.id] === undefined && it.id !== itemId);
  if (after >= 0) return after;
  const before = items.findIndex((it) => answers[it.id] === undefined && it.id !== itemId);
  return before >= 0 ? before : items.length;
}

/** Erreur de chargement → clé de message (réseau coupé ou 5xx : « connexion coupée » ; le reste : lien invalide). */
export function loadErrorKey(status: number): 'network' | 'invalid' {
  return status === 0 || status >= 500 ? 'network' : 'invalid';
}

/** Message d'un échec d'envoi : jamais de message technique à l'enfant ; ses réponses restent là. */
export function submitErrorMessage(c: QuestionnaireCopy, input: { status?: number; code?: string | null }): string {
  if (input.code === 'incomplete') return c.incomplete;
  if (input.code === 'already_completed') return c.alreadyShort;
  if (input.code) return c.genericErr;
  return input.status === 0 || (input.status ?? 0) >= 500 ? c.network : c.genericErr;
}

/** Texte de l'écran de fin ou d'erreur. */
export function outcomeMessage(c: QuestionnaireCopy, o: { done: boolean; completed?: boolean; error?: string }): { ok: boolean; message: string } {
  if (o.done) return { ok: true, message: c.thanks };
  if (o.completed) return { ok: true, message: c.already };
  return { ok: false, message: o.error === 'expired' ? c.expired : o.error === 'network' ? c.network : c.invalid };
}
