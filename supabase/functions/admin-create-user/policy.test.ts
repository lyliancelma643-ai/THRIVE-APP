import { assertEquals } from "jsr:@std/assert@1";
import { parentQuotaReached, passwordProblem, planCreation } from "./policy.ts";

Deno.test("un parent ne peut qu'inviter un co-parent", () => {
  assertEquals(planCreation("PARENT", "PARENT"), { ok: true, mode: "invite" });
  assertEquals(planCreation("PARENT", "COACH").ok, false);
  assertEquals(planCreation("PARENT", "ADMIN").ok, false);
});

Deno.test("un coach ou un enfant ne crée rien", () => {
  assertEquals(planCreation("COACH", "PARENT").ok, false);
  assertEquals(planCreation("CHILD", "PARENT").ok, false);
});

Deno.test("l'admin crée en direct, ADMIN réservé au super admin", () => {
  assertEquals(planCreation("ADMIN", "COACH"), { ok: true, mode: "direct" });
  assertEquals(planCreation("ADMIN", "ADMIN").ok, false);
  assertEquals(planCreation("SUPER_ADMIN", "ADMIN"), { ok: true, mode: "direct" });
});

Deno.test("quota de comptes parents", () => {
  assertEquals(parentQuotaReached(1, 1), true);
  assertEquals(parentQuotaReached(1, 2), false);
  assertEquals(parentQuotaReached(5, null), false);
});

Deno.test("politique de mot de passe", () => {
  assertEquals(passwordProblem("Abcdefghij1k"), null);
  assertEquals(passwordProblem("court1A") !== null, true);
  assertEquals(passwordProblem("abcdefghijkl1") !== null, true);
});
