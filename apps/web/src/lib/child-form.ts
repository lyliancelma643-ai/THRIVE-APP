// Règles communes de saisie d'un profil enfant — inscription (/login) et ajout
// de profil (/parent/select-profile). Une seule source : mêmes bornes d'âge,
// même liste de sports, même calcul de date de naissance.

/** Le parcours THRIVE s'adresse aux 8–17 ans (contenus par tranche d'âge). */
export const CHILD_MIN_AGE = 8;
export const CHILD_MAX_AGE = 17;

export const SPORT_OPTIONS = [
  'Hockey',
  'Soccer',
  'Basketball',
  'Natation',
  'Tennis',
  'Volleyball',
  'Gymnastique',
  'Arts martiaux',
  'Baseball',
  'Patinage',
  'Football',
  'Athlétisme',
  'Autre',
] as const;

/**
 * Date de naissance approximative à partir d'un âge, au format AAAA-MM-JJ en
 * date LOCALE (toISOString passerait en UTC : le soir à Montréal, on
 * enregistrerait le lendemain).
 */
export function ageToDob(age: number, today = new Date()): string {
  const d = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Message d'erreur si l'âge saisi n'est pas un entier entre 8 et 17, sinon null. */
export function childAgeError(age: string, firstName?: string): string | null {
  const who = firstName?.trim() || "l'enfant";
  if (!age.trim()) return `Indique l'âge de ${who}.`;
  const n = Number(age);
  if (!Number.isInteger(n) || n < CHILD_MIN_AGE || n > CHILD_MAX_AGE)
    return `L'âge de ${who} doit être compris entre ${CHILD_MIN_AGE} et ${CHILD_MAX_AGE} ans.`;
  return null;
}

export type ChildRow = { firstName: string; age: string; sport: string };

/**
 * Lignes « enfant » du formulaire d'inscription. Une ligne entièrement vide
 * est ignorée (le parent peut ajouter ses enfants plus tard) ; une ligne à
 * moitié remplie est une erreur — on ne jette jamais en silence un enfant
 * dont le prénom a été saisi.
 */
export function validateChildRows(rows: ChildRow[]): { children: ChildRow[]; error: string | null } {
  const children: ChildRow[] = [];
  for (const [i, r] of rows.entries()) {
    const name = r.firstName.trim();
    if (!name && !r.age.trim()) continue;
    if (!name) return { children: [], error: `Indique le prénom de l'enfant ${i + 1}.` };
    const err = childAgeError(r.age, name);
    if (err) return { children: [], error: err };
    children.push({ ...r, firstName: name });
  }
  return { children, error: null };
}
