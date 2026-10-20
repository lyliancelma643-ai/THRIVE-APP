import { Platform } from 'react-native';
import { legalLinks } from '../../services/subscription-logic';
import { LEGAL as LEGAL_URLS } from '../../services/legal';

// Liens légaux exigés par Apple (3.1.2) et Google sur tout écran d'abonnement.
// Conditions : sur iOS seulement, le contrat de licence standard d'Apple (EULA)
// sert de repli. La politique de confidentialité n'a PAS de repli : sans URL
// de confidentialité https valide (services/legal.ts), `LEGAL.complete` est faux et le paywall ne vend pas.
// (L'ancienne palette `C` est supprimée : les couleurs viennent de useTheme().)
export const LEGAL = legalLinks(
  { terms: LEGAL_URLS.terms, privacy: LEGAL_URLS.privacy },
  Platform.OS,
);
