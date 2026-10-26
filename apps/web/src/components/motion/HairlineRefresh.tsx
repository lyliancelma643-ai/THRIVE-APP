/**
 * Filet de 2 px sous l'en-tête pendant une revalidation d'une page DÉJÀ visitée (jamais à la première visite) :
 * balaie de gauche à droite (70 % de 700 ms) puis s'efface. `tick` : changer la clé relance le balayage.
 */
export function HairlineRefresh({ active, tick = 0 }: { active: boolean; tick?: number }) {
  if (!active) return null;
  return <div key={tick} aria-hidden className="pointer-events-none h-0.5 w-full origin-left bg-accent-ink animate-hairline" />;
}
