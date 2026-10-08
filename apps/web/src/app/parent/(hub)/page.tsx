import { redirect } from 'next/navigation';

// La zone parent s'ouvre sur Maison (premier onglet).
// Bilan et Mes séances sont les deux autres onglets.
// Onboarding (login / confirmation sans enfant) : ?setup=children → ajout de l'enfant,
// sans perdre l'intention (avant, le paramètre était perdu à cette redirection).
export default async function ParentIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string | string[] }> | { setup?: string | string[] };
}) {
  const params = await searchParams;
  if (params?.setup === 'children') {
    redirect('/parent/select-profile?type=CHILD&from=signup');
  }
  redirect('/parent/fitness');
}
