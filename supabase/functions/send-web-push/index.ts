// Edge Function : send-web-push
// Envoie une notification Web Push (VAPID) à tous les navigateurs abonnés
// d'un utilisateur. Appelable par service_role (webhook DB, jobs) ou par un
// compte ADMIN/SUPER_ADMIN.
// Secrets requis : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// (mailto:…) — sans eux la fonction répond 503 sans rien tenter.
// Body : { user_id: uuid, title: string, body?: string, data?: { url?: string } }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import { withSentry, captureError } from "../_shared/sentry.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@thrive.app";

Deno.serve(withSentry("send-web-push", async (req: Request) => {
  try {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return json({ error: "vapid_not_configured" }, 503);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Autorisation : service_role (webhooks/jobs) ou admin connecté.
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!isServiceRole) {
      const { data: caller, error } = await admin.auth.getUser(token);
      const role = caller?.user?.app_metadata?.role;
      if (error || !["ADMIN", "SUPER_ADMIN"].includes(role)) {
        return json({ error: "forbidden" }, 403);
      }
    }

    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title) return json({ error: "user_id et title requis" }, 400);

    const { data: subs, error: subsError } = await admin
      .from("web_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);
    if (subsError) throw subsError;
    if (!subs?.length) return json({ sent: 0, skipped: "no_subscription" });

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    const payload = JSON.stringify({ title, body, data: data ?? {} });

    let sent = 0;
    const gone: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410 : abonnement expiré ou révoqué → purge
          if (status === 404 || status === 410) gone.push(s.id);
          else await captureError(err, { endpoint: s.endpoint });
        }
      }),
    );

    if (gone.length) {
      await admin.from("web_push_subscriptions").delete().in("id", gone);
    }
    if (sent) {
      await admin
        .from("web_push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_id", user_id);
    }

    return json({ sent, purged: gone.length });
  } catch (e) {
    await captureError(e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
}));
