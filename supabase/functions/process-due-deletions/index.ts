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
//
// Cycle d'une demande : PENDING (processed_at null) → prise (processed_at posé,
// statut toujours PENDING, donc encore visible par l'app et l'alerte S1) →
// suppression réussie → statut DONE_STATUS (la ligne disparaît le plus souvent
// avec le profil, par cascade). Échec → processed_at remis à null. Une prise
// restée en plan (crash, timeout) est reprise après STALE_CLAIM_MS.
// SUPER_ADMIN et ADMIN : jamais supprimés ici (échec explicite → alerte S1).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { captureError, withSentry } from "../_shared/sentry.ts";
import { cleanupBilling, type BillingRow } from "../admin-delete-user/billing_cleanup.ts";
import {
  DONE_STATUS, isAuthorized, isProtectedRole, isUserNotFound, processDue, STALE_CLAIM_MS, type Deps,
} from "./core.ts";

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
        const stale = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
        const { data, error } = await admin
          .from("deletion_requests")
          .select("id, target_profile_id")
          .eq("status", "PENDING")
          .or(`processed_at.is.null,processed_at.lt.${stale}`)
          .lte("due_at", new Date().toISOString())
          .order("due_at")
          .limit(50);
        if (error) throw new Error(error.message);
        return data ?? [];
      },
      claim: async (id) => {
        // Update conditionnel = verrou atomique : une seule exécution gagne la ligne.
        const stale = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
        const { data, error } = await admin
          .from("deletion_requests")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", id)
          .eq("status", "PENDING")
          .or(`processed_at.is.null,processed_at.lt.${stale}`)
          .select("id");
        if (error) throw new Error(error.message);
        return (data?.length ?? 0) > 0;
      },
      finalize: async (id) => {
        await admin.from("deletion_requests").update({ status: DONE_STATUS }).eq("id", id)
          .then(() => {}, () => {});
      },
      release: async (id) => {
        await admin.from("deletion_requests").update({ processed_at: null }).eq("id", id).eq("status", "PENDING")
          .then(() => {}, () => {});
      },
      deleteAccount: async (userId) => {
        const { data: target, error: tErr } = await admin.auth.admin.getUserById(userId);
        const authGone = tErr ? isUserNotFound(tErr as { status?: number; code?: string; message?: string })
          : !target?.user;
        if (tErr && !authGone) return { ok: false, error: `lecture compte: ${tErr.message}` };
        if (authGone) {
          // Compte Auth absent : succès seulement si aucune donnée ne subsiste.
          // Profil orphelin = anomalie (cascade non jouée) : on NE le supprime PAS
          // ici (pas de nettoyage facturation possible sans le compte, risque de
          // prélèvement résiduel) ; échec explicite → demande reste PENDING,
          // visible dans l'alerte S1 quotidienne, traitement manuel sous 30 j (Loi 25).
          const { data: prof, error: pErr } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
          if (pErr) return { ok: false, error: `lecture profil: ${pErr.message}` };
          if (prof) return { ok: false, error: "compte Auth absent mais profil orphelin : traitement manuel requis" };
          return { ok: true };
        }
        if (!target?.user) return { ok: false, error: "lecture compte: réponse vide" };
        const role = target.user.app_metadata?.role;
        if (isProtectedRole(role)) {
          return { ok: false, error: `${role} : suppression manuelle requise` };
        }

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
        if (delErr) return { ok: false, error: delErr.message };

        // Trace d'audit après suppression effective (colonnes : user_id, action,
        // table_name, record_id, new_data). user_id null = action système.
        await admin.from("audit_logs").insert({
          user_id: null,
          action: "DELETE_ACCOUNT",
          table_name: "auth.users",
          record_id: userId,
          new_data: { source: "process-due-deletions", deleted_role: role ?? null },
        }).then(() => {}, () => {});
        return { ok: true };
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
