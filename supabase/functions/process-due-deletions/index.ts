// Edge Function : process-due-deletions
// Traite chaque jour (pg_cron → pg_net, migration 079) les demandes de suppression
// (Loi 25) dont l'échéance est passée. Reprend la logique d'admin-delete-user
// (nettoyage facturation puis suppression Auth + cascade) sans passer par son
// contrôle SUPER_ADMIN : cette fonction n'est appelable que par le secret partagé
// Vault 'deletions_cron_secret' (header x-cron-secret) ou la clé service_role.
//
// Secrets : DELETIONS_CRON_SECRET (= valeur Vault deletions_cron_secret),
//           STRIPE_SECRET_KEY, REVENUECAT_SECRET_API_KEY (optionnels).
// Déploiement : verify_jwt = false (auth par secret partagé).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { captureError, withSentry } from "../_shared/sentry.ts";
import { cleanupBilling, type BillingRow } from "../admin-delete-user/billing_cleanup.ts";
import { isAuthorized, processDue, type Deps } from "./core.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(withSentry("process-due-deletions", async (req: Request) => {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (req.method !== "POST") return json({ error: "POST requis" }, 405);
  if (!isAuthorized(req, { cronSecret: Deno.env.get("DELETIONS_CRON_SECRET") ?? "", serviceRoleKey })) {
    return json({ error: "Non autorisé" }, 401);
  }

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);

    const deps: Deps = {
      log: (m) => console.log(`[process-due-deletions] ${m}`),
      listDue: async () => {
        const { data, error } = await admin
          .from("deletion_requests")
          .select("id, target_profile_id")
          .is("processed_at", null)
          .lte("due_at", new Date().toISOString())
          .order("due_at")
          .limit(50);
        if (error) throw new Error(error.message);
        return data ?? [];
      },
      claim: async (id) => {
        const { data, error } = await admin
          .from("deletion_requests")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", id)
          .is("processed_at", null)
          .select("id");
        if (error) throw new Error(error.message);
        return (data?.length ?? 0) > 0;
      },
      release: async (id) => {
        await admin.from("deletion_requests").update({ processed_at: null }).eq("id", id)
          .then(() => {}, () => {});
      },
      deleteAccount: async (userId) => {
        const { data: target, error: tErr } = await admin.auth.admin.getUserById(userId);
        if (tErr || !target?.user) return { ok: true }; // compte déjà supprimé : rien à faire
        if (target.user.app_metadata?.role === "SUPER_ADMIN") {
          return { ok: false, error: "Super Admin : suppression manuelle requise" };
        }
        await admin.from("audit_logs").insert({
          user_id: null,
          action: "DELETE_ACCOUNT",
          table_name: "auth.users",
          record_id: userId,
          new_data: { source: "process-due-deletions", deleted_role: target.user.app_metadata?.role },
        }).then(() => {}, () => {});

        const { data: billing, error: bErr } = await admin
          .from("billing_subscriptions")
          .select("stripe_customer_id, store, active")
          .eq("user_id", userId)
          .maybeSingle();
        if (bErr && bErr.code !== "42P01") return { ok: false, error: `abonnement: ${bErr.message}` };
        const cleanup = await cleanupBilling(userId, (billing ?? null) as BillingRow, {
          stripeSecretKey: Deno.env.get("STRIPE_SECRET_KEY") ?? "",
          revenueCatSecretKey: Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "",
        });
        if (!cleanup.ok) return { ok: false, error: cleanup.error };

        const { error: delErr } = await admin.auth.admin.deleteUser(userId);
        return delErr ? { ok: false, error: delErr.message } : { ok: true };
      },
    };

    const summary = await processDue(deps);
    return json({ ok: true, ...summary });
  } catch (e) {
    await captureError(e);
    console.error("[process-due-deletions]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
}));
