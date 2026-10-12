/** Identifiants de vignettes (logique pure, testable). 52 images : activités + BON-01. */
export const VIGNETTE_IDS: readonly string[] = [
  "ACT-0101",
  "ACT-0102",
  "ACT-0103",
  "ACT-0104",
  "ACT-0201",
  "ACT-0202",
  "ACT-0203",
  "ACT-0204",
  "ACT-0301",
  "ACT-0302",
  "ACT-0303",
  "ACT-0304",
  "ACT-0305",
  "ACT-0401",
  "ACT-0402",
  "ACT-0403",
  "ACT-0404",
  "ACT-0501",
  "ACT-0502",
  "ACT-0503",
  "ACT-0504",
  "ACT-0601",
  "ACT-0602",
  "ACT-0603",
  "ACT-0604",
  "ACT-0701",
  "ACT-0702",
  "ACT-0703",
  "ACT-0801",
  "ACT-0802",
  "ACT-0803",
  "ACT-0804",
  "ACT-0901",
  "ACT-0902",
  "ACT-0903",
  "ACT-1001",
  "ACT-1002",
  "ACT-1003",
  "ACT-1004",
  "ACT-1101",
  "ACT-1102",
  "ACT-1103",
  "ACT-1104",
  "ACT-1105",
  "ACT-1201",
  "ACT-1202",
  "ACT-1203",
  "ACT-1204",
  "ACT-1301",
  "ACT-1302",
  "ACT-1303",
  "BON-01",
] as const;

/** Mascotte de base : accueil, connexion, repli. */
export const BASE_VIGNETTE_ID = "ACT-0603";

const KNOWN = new Set<string>(VIGNETTE_IDS);

/** ACT-0704 n'a pas d'image ; tout id inconnu ou vide retombe sur la mascotte de base. */
export function resolveVignetteId(id: string | null | undefined): string {
  const k = (id ?? "").trim().toUpperCase();
  return KNOWN.has(k) ? k : BASE_VIGNETTE_ID;
}
