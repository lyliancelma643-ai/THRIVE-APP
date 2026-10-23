// Filet de sécurité des builds de production : une erreur JavaScript « fatale » (hors affichage : minuterie,
// événement natif, chargement d'un module) ferme normalement l'app sans un mot. Ici, elle est d'abord affichée
// dans une alerte native — avec son message et le début de sa pile — pour qu'un testeur puisse la transmettre.
// L'app est ensuite fermée comme avant si l'erreur se reproduit (pas de boucle d'alertes).
// En développement, rien ne change (écran rouge habituel).
import { Alert } from 'react-native';

type Handler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler: () => Handler; setGlobalHandler: (h: Handler) => void };

const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

if (!__DEV__ && errorUtils) {
  const previous = errorUtils.getGlobalHandler();
  let shown = false;
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (!isFatal || shown) {
      previous(error, isFatal);
      return;
    }
    shown = true;
    const e = error as { message?: string; stack?: string } | undefined;
    const message = String(e?.message ?? error);
    const stack = String(e?.stack ?? '')
      .split('\n')
      .slice(0, 6)
      .join('\n');
    try {
      Alert.alert(
        'THRIVE a rencontré une erreur',
        `Fais une capture de cet écran et envoie-la à l’équipe.\n\n${message}\n\n${stack}`,
        [{ text: 'Fermer l’app', style: 'destructive', onPress: () => previous(error, true) }],
        { cancelable: false },
      );
    } catch {
      previous(error, true);
    }
  });
}
