import { redirect } from 'next/navigation';

// La bibliothèque a été fusionnée dans les séances Fitness (/parent/fitness/seances).
// On garde l'URL vivante pour les favoris et liens existants.
export default function LibraryRedirectPage() {
  redirect('/parent/fitness/seances');
}
