// deno test --no-config supabase/functions/process-due-deletions/core.test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { type Deps, isAuthorized, isProtectedRole, processDue, safeEqual } from "./core.ts";

const SECRET = "s".repeat(32);
const env = { cronSecret: SECRET, serviceRoleKey: "service-role-key" };
const req = (h: Record<string, string>) => new Request("http://x", { method: "POST", headers: h });

Deno.test("safeEqual", () => {
  assertEquals(safeEqual("abc", "abc"), true);
  assertEquals(safeEqual("abc", "abd"), false);
  assertEquals(safeEqual("abc", "abcd"), false);
});

Deno.test("auth : secret partagé ou service_role, jamais vide", () => {
  assertEquals(isAuthorized(req({ "x-cron-secret": SECRET }), env), true);
  assertEquals(isAuthorized(req({ Authorization: "Bearer service-role-key" }), env), true);
  assertEquals(isAuthorized(req({ "x-cron-secret": "mauvais" }), env), false);
  assertEquals(isAuthorized(req({}), env), false);
  assertEquals(isAuthorized(req({}), { cronSecret: "", serviceRoleKey: "" }), false);
  assertEquals(isAuthorized(req({ "x-cron-secret": "" }), { cronSecret: "", serviceRoleKey: "" }), false);
});

Deno.test("processDue : supprime, ignore les déjà prises, libère en cas d'échec", async () => {
  const released: string[] = [];
  const deleted: string[] = [];
  const finalized: string[] = [];
  const deps: Deps = {
    log: () => {},
    listDue: () => Promise.resolve([
      { id: "r1", target_profile_id: "u1" },
      { id: "r2", target_profile_id: "u2" },
      { id: "r3", target_profile_id: "u3" },
    ]),
    claim: (id) => Promise.resolve(id !== "r2"),
    release: (id) => { released.push(id); return Promise.resolve(); },
    finalize: (id) => { finalized.push(id); return Promise.resolve(); },
    deleteAccount: (u) => {
      if (u === "u3") return Promise.resolve({ ok: false as const, error: "boom" });
      deleted.push(u);
      return Promise.resolve({ ok: true as const });
    },
  };
  const s = await processDue(deps);
  assertEquals(s, { due: 3, deleted: 1, skipped: 1, failed: [{ id: "r3", error: "boom" }] });
  assertEquals(deleted, ["u1"]);
  assertEquals(released, ["r3"]);
  assertEquals(finalized, ["r1"]);
});

Deno.test("rôles protégés : SUPER_ADMIN et ADMIN jamais supprimés automatiquement", () => {
  assertEquals(isProtectedRole("SUPER_ADMIN"), true);
  assertEquals(isProtectedRole("ADMIN"), true);
  assertEquals(isProtectedRole("PARENT"), false);
  assertEquals(isProtectedRole(undefined), false);
});
