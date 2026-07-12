// Helper Sentry partagé par toutes les edge functions.
// Inerte tant que le secret SENTRY_DSN n'est pas posé :
//   supabase secrets set SENTRY_DSN=https://…@…ingest.sentry.io/…
// (ou Dashboard → Edge Functions → Secrets). Aucun impact sinon.
//
// Usage : Deno.serve(withSentry("nom-fonction", handler));
import * as Sentry from "npm:@sentry/deno@10";

const DSN = Deno.env.get("SENTRY_DSN");

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: "production",
    // Les edge functions sont courtes : pas de tracing, uniquement les erreurs.
    tracesSampleRate: 0,
  });
}

type Handler = (req: Request) => Response | Promise<Response>;

/**
 * À appeler dans les blocs `catch` existants AVANT de renvoyer la réponse 500 :
 * les handlers avalent leurs erreurs (bonne pratique), donc sans cet appel
 * explicite rien ne remonterait. No-op sans DSN.
 */
export async function captureError(
  err: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (!DSN) return;
  try {
    Sentry.captureException(err, { extra });
    await Sentry.flush(2000);
  } catch {
    // La télémétrie ne doit jamais bloquer ni masquer la réponse.
  }
}

export function withSentry(fnName: string, handler: Handler): Handler {
  if (!DSN) return handler;
  Sentry.getCurrentScope().setTag("edge_function", fnName);
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      try {
        Sentry.captureException(err, { tags: { edge_function: fnName } });
        await Sentry.flush(2000);
      } catch {
        // La télémétrie ne doit jamais bloquer ni masquer la réponse.
      }
      console.error(`[${fnName}]`, err);
      return new Response(JSON.stringify({ error: "internal_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
