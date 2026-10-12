import { View } from 'react-native';
import { MascotHero, SPACING, ThemedText } from '../../design';

type Props = {
  /** Prénom réel de l'enfant concerné (jamais une valeur de démo). */
  childName?: string;
};

/**
 * Maquette E « Ton espace se prépare » : état d'attente affiché quand l'espace
 * d'un enfant n'est pas encore validé (confirmation admin puis validation coach).
 * Le dépôt mobile n'expose pas encore de statut PENDING sur Child : composant prêt,
 * à brancher quand ce statut sera disponible dans useChildren (non fait ici : hors périmètre).
 */
export function PreparingSpace({ childName }: Props) {
  return (
    <View accessible accessibilityRole="summary" style={{ alignItems: 'center', paddingVertical: SPACING.space8, paddingHorizontal: SPACING.space6 }}>
      <MascotHero size={160} />
      <ThemedText variant="title2" style={{ textAlign: 'center', marginTop: SPACING.space5 }} accessibilityRole="header">
        Ton espace se prépare
      </ThemedText>
      <ThemedText variant="body" color="label2" style={{ textAlign: 'center', marginTop: SPACING.space2 }}>
        {childName
          ? `Le coach valide l’espace de ${childName}. On te prévient dès que c’est prêt.`
          : 'Le coach valide ton espace. On te prévient dès que c’est prêt.'}
      </ThemedText>
    </View>
  );
}
