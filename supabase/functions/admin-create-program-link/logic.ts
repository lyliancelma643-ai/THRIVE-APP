// Cœur PUR de admin-create-program-link (aucune API Deno, testable tel quel).
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { PROGRAM_MODES, PROGRAM_PACKS } from "../_shared/program_billing.ts";

/** Corps strict : tout autre champ (montant, prix, devise, origin…) est refusé en 422. */
export const AdminProgramLinkRequest = z.object({
  parent_id: z.string().uuid(),
  pack: z.enum(PROGRAM_PACKS),
  mode: z.enum(PROGRAM_MODES),
}).strict();
export type AdminProgramLinkRequest = z.infer<typeof AdminProgramLinkRequest>;

/** Même contrôle que admin-refund-program-payment (app_metadata.role, non modifiable). */
export const LINK_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
export const canCreateProgramLink = (role: string | null | undefined): boolean => !!role && LINK_ROLES.has(role);
