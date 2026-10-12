// Lancer : deno test supabase/functions/admin-create-program-link/
import { assertEquals } from "jsr:@std/assert@1";
import { AdminProgramLinkRequest, canCreateProgramLink } from "./logic.ts";

const PARENT = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

Deno.test("seuls ADMIN et SUPER_ADMIN peuvent créer un lien", () => {
  assertEquals(canCreateProgramLink("ADMIN"), true);
  assertEquals(canCreateProgramLink("SUPER_ADMIN"), true);
  for (const r of ["PARENT", "COACH", "CHILD", "", null, undefined, "admin"]) {
    assertEquals(canCreateProgramLink(r as string | null | undefined), false, String(r));
  }
});

Deno.test("le corps accepte exactement { parent_id, pack, mode }", () => {
  assertEquals(AdminProgramLinkRequest.safeParse({ parent_id: PARENT, pack: "GROUPE", mode: "une_fois" }).success, true);
  assertEquals(AdminProgramLinkRequest.safeParse({ parent_id: "x", pack: "GROUPE", mode: "une_fois" }).success, false);
  assertEquals(AdminProgramLinkRequest.safeParse({ parent_id: PARENT, pack: "groupe", mode: "une_fois" }).success, false);
});

Deno.test("tout montant / prix / devise / origin envoyé par le client est refusé", () => {
  const base = { parent_id: PARENT, pack: "COMPLET", mode: "deux_versements" };
  for (const extra of [{ amount: 1 }, { amount_cents: 100 }, { price: "price_x" }, { currency: "cad" }, { origin: "https://x.test" }]) {
    assertEquals(AdminProgramLinkRequest.safeParse({ ...base, ...extra }).success, false, JSON.stringify(extra));
  }
});
