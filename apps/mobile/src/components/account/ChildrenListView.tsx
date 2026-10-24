import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
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
  /** Suppression (archivage) d'un enfant, après confirmation. */
  onDelete?: (id: string) => Promise<void>;
};

/**
 * « Mes enfants » (depuis Compte & famille) : un enfant par rangée, puis « Ajouter un enfant » (même formulaire que D).
 * « Modifier » (en haut à droite, geste iOS) montre la pastille rouge de suppression sur chaque enfant.
 */
export function ChildrenListView({ childrenList, onOpen, onAdd, onBack, onDelete }: Props) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const confirmDelete = (c: ChildListItem) =>
    Alert.alert(
      `Supprimer ${c.firstName} ?`,
      `${c.firstName} disparaîtra de ton espace (Maison, Bilan, Mes séances). Si c’est une erreur, l’équipe THRIVE peut restaurer son profil.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => void onDelete?.(c.id) },
      ],
    );
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
                  leading={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {editing ? (
                        <Pressable
                          onPress={() => confirmDelete(c)}
                          accessibilityRole="button"
                          accessibilityLabel={`Supprimer ${c.firstName}`}
                          hitSlop={10}
                          style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.sysRed, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <View style={{ width: 11, height: 2.5, borderRadius: 1.5, backgroundColor: '#FFFFFF' }} />
                        </Pressable>
                      ) : null}
                      <Avatar label={c.firstName.slice(0, 1)} size={44} />
                    </View>
                  }
                  leadingInset={editing ? 108 : 72}
                  title={c.firstName}
                  subtitle={sub || undefined}
                  value={`${c.age} ans`}
                  chevron={!editing}
                  onPress={() => (editing ? confirmDelete(c) : onOpen(c.id))}
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
        right={
          onDelete && childrenList.length > 0 ? (
            <Pressable onPress={() => setEditing((e) => !e)} accessibilityRole="button" hitSlop={10} style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
              <ThemedText variant="body" weight={editing ? 600 : 400} color="tintText">
                {editing ? 'OK' : 'Modifier'}
              </ThemedText>
            </Pressable>
          ) : undefined
        }
      />
    </View>
  );
}
