// Créneaux de l'appel de 15 minutes (Y3) : regroupement par jour et libellés en français. Logique PURE (testée).
// Les créneaux viennent du serveur (fonction `request-intro-call`, lot O4) ; ici on ne fait que les présenter.

export type SlotInput = {
  /** Début du créneau, ISO 8601. */
  iso: string;
  /** false = déjà pris (affiché barré, non sélectionnable). Défaut : disponible. */
  available?: boolean;
};

export type SlotOption = { iso: string; time: string; available: boolean };

export type DayOption = {
  /** Clé stable du jour (AAAA-MM-JJ, heure locale). */
  key: string;
  /** « lun. » */
  weekday: string;
  dayNum: number;
  /** « Mardi 14 octobre » (titre de la grille d'heures). */
  long: string;
  /** « Octobre 2026 » (titre de la rangée de jours). */
  month: string;
  /** « mardi 14 oct. » (bouton « Réserver … »). */
  short: string;
  slots: SlotOption[];
};

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const WEEKDAYS_ABBR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_ABBR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad2 = (n: number) => String(n).padStart(2, '0');

/** « 18 h 30 » (heure locale). */
export function formatSlotTime(d: Date): string {
  return `${d.getHours()} h ${pad2(d.getMinutes())}`;
}

/** Regroupe les créneaux par jour (heure locale), jours et heures triés ; les dates illisibles sont ignorées. */
export function groupSlotsByDay(slots: readonly SlotInput[]): DayOption[] {
  const days = new Map<string, DayOption & { sort: number }>();
  for (const s of slots) {
    const d = new Date(s.iso);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    let day = days.get(key);
    if (!day) {
      const wd = d.getDay();
      day = {
        key,
        weekday: WEEKDAYS_ABBR[wd],
        dayNum: d.getDate(),
        long: `${cap(WEEKDAYS[wd])} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
        month: `${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`,
        short: `${WEEKDAYS[wd]} ${d.getDate()} ${MONTHS_ABBR[d.getMonth()]}`,
        slots: [],
        sort: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      };
      days.set(key, day);
    }
    day.slots.push({ iso: s.iso, time: formatSlotTime(d), available: s.available !== false });
  }
  return [...days.values()]
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort: _sort, ...day }) => ({ ...day, slots: [...day.slots].sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime()) }));
}

/** « Réserver mardi 14 oct. · 18 h 30 » ; « Choisis un créneau » tant qu'aucun créneau n'est choisi. */
export function bookLabel(day: DayOption | null | undefined, slot: SlotOption | null | undefined): string {
  return day && slot ? `Réserver ${day.short} · ${slot.time}` : 'Choisis un créneau';
}
