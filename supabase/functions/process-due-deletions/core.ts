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

export type Deps = {
  /** Demandes non traitées dont l'échéance est passée. */
  listDue: () => Promise<DueRequest[]>;
  /** Pose processed_at si encore null ; false = déjà prise par un autre passage. */
  claim: (id: string) => Promise<boolean>;
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
