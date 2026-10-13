import { ScrollView, View } from 'react-native';
import {
  Avatar, Button, GlassButton, LargeTitle, List, ListRow, NavBar, Section, ThemedText, useLargeTitle, useNavBarHeight, useTheme,
} from '../../design';

export type ChildListItem = {
  id: string;
  firstName: string;
  /** Âge calculé (ans). */
  age: number;
  sport?: string | null;
  badges: string[];
};

type Props = {
  childrenList: ChildListItem[];
  onOpen: (id: string) => void;
  onAdd: () => void;
  onBack: () => void;
};

/** « Mes enfants » (depuis Compte & famille) : un enfant par rangée, puis « Ajouter un enfant » (même formulaire que D). */
export function ChildrenListView({ childrenList, onOpen, onAdd, onBack }: Props) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const lt = useLargeTitle();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView onScroll={lt.onScroll} scrollEventThrottle={lt.scrollEventThrottle} contentContainerStyle={{ paddingTop: navH, paddingBottom: 40 }}>
        <LargeTitle>Mes enfants</LargeTitle>
        <Section style={{ marginTop: 14 }}>
          <List>
            {childrenList.map((c) => {
              const sub = [c.sport, ...c.badges].filter(Boolean).join(' · ');
              return (
                <ListRow
                  key={c.id}
                  large
                  leading={<Avatar label={c.firstName.slice(0, 1)} size={44} />}
                  leadingInset={72}
                  title={c.firstName}
                  subtitle={sub || undefined}
                  value={`${c.age} ans`}
                  onPress={() => onOpen(c.id)}
                />
              );
            })}
          </List>
        </Section>
        <Section style={{ marginTop: 14 }}>
          <Button variant="gray" glyph="plus" label="Ajouter un enfant" onPress={onAdd} />
        </Section>
        {childrenList.length === 0 ? (
          <ThemedText variant="sub" color="label2" style={{ textAlign: 'center', marginTop: 24, paddingHorizontal: 24 }}>
            Aucun enfant ajouté.
          </ThemedText>
        ) : null}
      </ScrollView>
      <NavBar
        title="Mes enfants"
        titleVisible={lt.titleVisible}
        edge={lt.edge}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
      />
    </View>
  );
}
