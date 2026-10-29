// Le moment est un onglet : le quitter ne le démonte pas, et chaque retour de focus est une NOUVELLE entrée (le flot repart de
// zéro). Mais « Voir » un objet débloqué (écran de fin) est un détour, pas une sortie : au retour, le parent doit retrouver
// l'écran de fin, pas le check-in. L'écran pose ce drapeau juste avant le détour ; le retour de focus le consomme UNE fois.
let hold = false;

export const holdFlowForReturn = () => {
  hold = true;
};

/** Vrai une seule fois après `holdFlowForReturn()` : le flot est conservé au lieu d'être réinitialisé. */
export function consumeFlowHold(): boolean {
  const was = hold;
  hold = false;
  return was;
}
