// Nettoyage des événements Sentry AVANT envoi (navigateur, Node, Edge).
// Public : des parents et des mineurs (Loi 25). On ne transmet ni courriel,
// ni jeton, ni cookie, ni identifiant de session de paiement : seulement de
// quoi reproduire le bug. L'id utilisateur (uuid opaque) est conservé pour
// regrouper les erreurs d'un même compte.
import type { ErrorEvent, EventHint } from '@sentry/nextjs';

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

export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
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
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  for (const b of event.breadcrumbs ?? []) {
    if (b.message) b.message = scrubText(b.message);
    if (b.data?.url && typeof b.data.url === 'string') b.data.url = scrubText(b.data.url);
    if (b.data?.to && typeof b.data.to === 'string') b.data.to = scrubText(b.data.to);
    if (b.data?.from && typeof b.data.from === 'string') b.data.from = scrubText(b.data.from);
  }
  if (event.transaction) event.transaction = scrubText(event.transaction);
  return event;
}
