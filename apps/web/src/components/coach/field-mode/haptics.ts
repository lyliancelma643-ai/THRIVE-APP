// Retour haptique : le coach doit sentir que c'est enregistré sans regarder.
// Indisponible sur iOS Safari — dégradation silencieuse, jamais d'erreur.
export function tap() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* plateforme sans vibreur */
  }
}

export function confirm() {
  try {
    navigator.vibrate?.([10, 40, 18]);
  } catch {
    /* plateforme sans vibreur */
  }
}
