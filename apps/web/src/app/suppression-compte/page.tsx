// URL de suppression de compte déclarée à Google Play : redirige vers la
// section #suppression de la politique de confidentialité (source unique).
import { redirect } from 'next/navigation';
import { DELETION_PATH } from '@/lib/legal';

export default function SuppressionCompteRedirect() {
  redirect(DELETION_PATH);
}
