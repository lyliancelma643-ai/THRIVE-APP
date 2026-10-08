// Ancienne adresse de la politique de confidentialité, gardée pour les URL
// déjà déclarées (app mobile, fiches stores). Source unique : /politique-confidentialite.
import { redirect } from 'next/navigation';
import { PRIVACY_PATH } from '@/lib/legal';

export default function ConfidentialiteRedirect() {
  redirect(PRIVACY_PATH);
}
