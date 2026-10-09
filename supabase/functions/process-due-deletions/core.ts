// Logique pure de process-due-deletions (testable sans réseau ni base).

/** Comparaison à temps constant de deux chaînes (évite les fuites par timing). */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Autorisé = secret partagé (x-cron-secret) OU service_role (Bearer), jamais vide. */
export function isAuthorized(
  req: Request,
  env: { cronSecret: string; serviceRoleKey: string },
): boolean {
  const shared = req.headers.get("x-cron-secret") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const okShared = env.cronSecret.length >= 16 && shared !== "" && safeEqual(shared, env.cronSecret);
  const okRole = env.serviceRoleKey !== "" && bearer !== "" && safeEqual(bearer, env.serviceRoleKey);
  return okShared || okRole;
}

export type DueRequest = { id: string; target_profile_id: string };

/**
 * Statut écrit APRÈS une suppression réussie. Aucune valeur « traitée » n'est
 * prouvée dans le dépôt (pas de CHECK sur deletion_requests.status, aucun écran
 * admin n'écrit ce statut ; seul 'PENDING' est lu par request-account-deletion,
 * DeleteAccountSection et overdue_deletion_requests). En pratique la ligne
 * disparaît avec le compte (FK target_profile_id → profiles ON DELETE CASCADE) :
 * ce statut ne subsiste que si le profil survit. Choix aligné sur la convention
 * du produit (sessions/questionnaires : 'COMPLETED').
 */
export const DONE_STATUS = "COMPLETED";

/** Une prise (processed_at posé, statut encore PENDING) plus vieille que ce délai est reprise. */
export const STALE_CLAIM_MS = 6 * 60 * 60 * 1000;

/** Rôles jamais supprimés automatiquement (suppression manuelle par un Super Admin). */
export const PROTECTED_ROLES = ["SUPER_ADMIN", "ADMIN"];

/**
 * Vrai « compte Auth introuvable » renvoyé par auth.admin.getUserById
 * (AuthApiError de @supabase/auth-js : status 404 + code GoTrue 'user_not_found',
 * message « User not found »). Un 404 quelconque (route, proxy, passerelle) NE
 * suffit PAS : il serait pris à tort pour un compte déjà supprimé.
 */
export function isUserNotFound(err: { status?: number; code?: string; message?: string } | null): boolean {
  if (!err || err.status !== 404) return false;
  if (err.code !== undefined) return err.code === "user_not_found";
  return (err.message ?? "").trim() === "User not found";
}

export function isProtectedRole(role: unknown): boolean {
  return typeof role === "string" && PROTECTED_ROLES.includes(role);
}

export type Deps = {
  /** Demandes non traitées dont l'échéance est passée. */
  listDue: () => Promise<DueRequest[]>;
  /**
   * Prise atomique : pose processed_at si la ligne est encore PENDING et non prise
   * (ou prise périmée) ; le statut reste PENDING jusqu'à la suppression effective.
   * false = déjà prise par un autre passage.
   */
  claim: (id: string) => Promise<boolean>;
  /** Suppression réussie : statut DONE_STATUS (no-op si la ligne a disparu par cascade). */
  finalize: (id: string) => Promise<void>;
  /** Remet processed_at à null (suppression échouée → nouvel essai demain). */
  release: (id: string) => Promise<void>;
  /** Suppression complète du compte (facturation + Auth + cascade). */
  deleteAccount: (userId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  log: (msg: string) => void;
};

export type Summary = { due: number; deleted: number; skipped: number; failed: { id: string; error: string }[] };

export async function processDue(deps: Deps): Promise<Summary> {
  const due = await deps.listDue();
  const out: Summary = { due: due.length, deleted: 0, skipped: 0, failed: [] };
  for (const r of due) {
    if (!(await deps.claim(r.id))) {
      out.skipped++; // idempotence : déjà traitée
      continue;
    }
    const res = await deps.deleteAccount(r.target_profile_id);
    if (res.ok) {
      await deps.finalize(r.id);
      out.deleted++;
      deps.log(`deletion ok request=${r.id}`);
    } else {
      await deps.release(r.id);
      out.failed.push({ id: r.id, error: res.error });
      deps.log(`deletion FAILED request=${r.id}: ${res.error}`);
    }
  }
  return out;
}
