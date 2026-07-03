import { redirect } from 'next/navigation';

// La zone parent s'ouvre sur le Bilan (équivalent de l'onglet Résumé d'Apple Forme).
// L'ancien contenu d'accueil vit désormais dans l'onglet Fitness (/parent/fitness).
export default function ParentIndexPage() {
  redirect('/parent/bilans');
}
