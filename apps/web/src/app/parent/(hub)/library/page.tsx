import { redirect } from 'next/navigation';

// La bibliothèque a été fusionnée dans l'onglet Fitness (/parent/fitness).
// On garde l'URL vivante pour les favoris et liens existants.
export default function LibraryRedirectPage() {
  redirect('/parent/fitness');
}
