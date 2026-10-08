// Nettoyage des événements Sentry AVANT envoi (navigateur, Node, Edge).
// Public : des parents et des mineurs (Loi 25). On ne transmet ni courriel,
// ni jeton, ni cookie, ni identifiant de session de paiement : seulement de
// quoi reproduire le bug. L'id utilisateur (uuid opaque) est conservé pour
// regrouper les erreurs d'un même compte.
//
// Trois points d'entrée, branchés dans sentry.server/edge.config.ts et
// instrumentation-client.ts :
//   - beforeSend              → erreurs (scrubEvent) ;
//   - beforeSendTransaction   → traces de performance (scrubTransaction), qui
//     portent des URL et des libellés de requêtes (spans) non couverts sinon.
import type { ErrorEvent, Event, EventHint } from '@sentry/nextjs';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Lien de questionnaire envoyé aux familles : le jeton donne accès aux réponses.
const QUESTIONNAIRE_PATH = /\/q\/[^/?#\s]+/g;
const SENSITIVE_QUERY = /([?&](?:session_id|token|access_token|refresh_token|code|token_hash)=)[^&#\s]+/gi;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

export function scrubText(s: string): string {
  return s
    .replace(JWT, '[jwt]')
    .replace(EMAIL, '[courriel]')
    .replace(QUESTIONNAIRE_PATH, '/q/[jeton]')
    .replace(SENSITIVE_QUERY, '$1[masqué]');
}

// Parcourt extra / contexts / tags : chaînes nettoyées, objets trop profonds
// remplacés plutôt que transmis (on préfère perdre un détail que fuiter).
function scrubDeep(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= 4) return '[tronqué]';
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = scrubDeep(v, depth + 1);
  return out;
}

// Champs communs aux erreurs et aux transactions.
function scrubCommon(event: Event): void {
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;

  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      const { ['user-agent']: ua, ['User-Agent']: UA } = event.request.headers;
      event.request.headers = ua || UA ? { 'user-agent': ua ?? UA } : {};
    }
    if (event.request.url) event.request.url = scrubText(event.request.url);
    if (event.request.query_string) event.request.query_string = '[masqué]';
  }

  if (event.message) event.message = scrubText(event.message);
  if (event.transaction) event.transaction = scrubText(event.transaction);

  for (const b of event.breadcrumbs ?? []) {
    if (b.message) b.message = scrubText(b.message);
    if (b.data?.url && typeof b.data.url === 'string') b.data.url = scrubText(b.data.url);
    if (b.data?.to && typeof b.data.to === 'string') b.data.to = scrubText(b.data.to);
    if (b.data?.from && typeof b.data.from === 'string') b.data.from = scrubText(b.data.from);
  }

  event.extra = scrubDeep(event.extra) as Event['extra'];
  event.contexts = scrubDeep(event.contexts) as Event['contexts'];
  event.tags = scrubDeep(event.tags) as Event['tags'];
}

export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  scrubCommon(event);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  return event;
}

// Générique : le type TransactionEvent n'est pas réexporté par @sentry/nextjs.
export function scrubTransaction<T extends Event>(event: T, _hint?: EventHint): T | null {
  scrubCommon(event);
  const spans = (event as Event & { spans?: { description?: string; data?: Record<string, unknown> }[] }).spans;
  for (const span of spans ?? []) {
    if (span.description) span.description = scrubText(span.description);
    // Attributs de span : valeurs primitives ou listes de primitives.
    for (const [k, v] of Object.entries(span.data ?? {})) {
      if (typeof v === 'string') span.data![k] = scrubText(v);
      else if (Array.isArray(v)) span.data![k] = v.map((x) => (typeof x === 'string' ? scrubText(x) : x)) as string[];
    }
  }
  return event;
}
