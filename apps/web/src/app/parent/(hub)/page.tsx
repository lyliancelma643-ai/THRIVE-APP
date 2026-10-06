import { redirect } from 'next/navigation';

// La zone parent s'ouvre sur Maison (premier onglet).
// Bilan et Mes séances sont les deux autres onglets.
export default function ParentIndexPage() {
  redirect('/parent/fitness');
}
