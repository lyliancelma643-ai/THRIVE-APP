import { notFound } from 'next/navigation';
import { asProgramPack } from '@/lib/program-packs';
import { ProgrammeView } from './ProgrammeView';

// /parent/programme/{groupe|individuel|complet} : choix et paiement d'un programme,
// et page de retour de Stripe (?checkout=success|cancel). Pack inconnu → 404.
export default async function ProgrammePage({ params }: { params: Promise<{ pack: string }> }) {
  const { pack } = await params;
  const programPack = asProgramPack(pack.toUpperCase());
  if (!programPack) notFound();
  return <ProgrammeView pack={programPack} />;
}
