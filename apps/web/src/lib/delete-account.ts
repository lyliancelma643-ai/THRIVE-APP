export const DELETE_CONFIRM_WORD = 'SUPPRIMER';

/** Vrai si le mot saisi confirme la suppression (insensible à la casse et aux espaces). */
export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim().toUpperCase() === DELETE_CONFIRM_WORD;
}
