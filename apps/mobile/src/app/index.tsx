import { View } from 'react-native';
import { useTheme } from '../design';

// Racine « / » : un écran neutre le temps de relire la session enregistrée. Le layout racine envoie ensuite
// un parent connecté directement dans son espace (homeFor), et seulement les autres vers Bienvenue.
export default function Index() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} />;
}
