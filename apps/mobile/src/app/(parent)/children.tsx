import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { useFamily, useChildren } from '@thrive/shared';
import { OfflineState } from '../../components/OfflineState';
import { GlassButton, ListGroup, ListRow, Pill, Sheet, SPACING, ThemedText, useTheme } from '../../design';
import { AuthButton, AuthField } from '../../components/account/AuthScaffold';

function calculateAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function ChildrenScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { colors } = useTheme();
  const { family, isLoading: familyLoading, error: familyError, refetch: refetchFamily, createFamily } = useFamily(user?.id);
  const { children, isLoading, error: childrenError, refetch: refetchChildren, createChild } = useChildren(family?.id);

  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!firstName || !lastName || !dob) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }
    setSaving(true);
    try {
      if (!family) {
        await createFamily(`Famille ${user?.lastName ?? ''}`);
      }
      await createChild({ first_name: firstName, last_name: lastName, date_of_birth: dob });
      setShowModal(false);
      setFirstName(''); setLastName(''); setDob('');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  };

  if (isLoading || familyLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgGrouped }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if ((familyError || childrenError) && !family && children.length === 0) {
    return <OfflineState onRetry={() => Promise.all([refetchFamily(), refetchChildren()])} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgGrouped }} contentContainerStyle={{ paddingHorizontal: SPACING.space4, paddingTop: SPACING.space8 * 2, paddingBottom: SPACING.space8 * 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.space5 }}>
        <ThemedText variant="largeTitle" accessibilityRole="header">Mes enfants</ThemedText>
        <GlassButton icon="add" label="Ajouter" tinted accessibilityLabel="Ajouter un enfant" onPress={() => setShowModal(true)} />
      </View>

      {children.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: SPACING.space8 }}>
          <ThemedText variant="body" color="label2" style={{ textAlign: 'center' }}>
            Aucun enfant ajouté.{`\n`}Appuie sur Ajouter pour commencer.
          </ThemedText>
        </View>
      ) : (
        <ListGroup>
          {children.map((child, i) => {
            const badges = (child.child_badges ?? []).map((cb) => cb.badges.name);
            return (
              <View key={child.id}>
                <ListRow
                  title={`${child.first_name} ${child.last_name}`}
                  subtitle={`${calculateAge(child.date_of_birth)} ans`}
                  last={i === children.length - 1 && badges.length === 0}
                  onPress={() => router.push({ pathname: '/(parent)/badges', params: { childId: child.id } })}
                />
                {badges.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.space2, paddingHorizontal: SPACING.space4, paddingBottom: SPACING.space3 }}>
                    {badges.map((name, j) => <Pill key={j} label={name} tone="accent" />)}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ListGroup>
      )}

      <Sheet visible={showModal} onClose={() => setShowModal(false)} title="Nouvel enfant" detent="large">
        <AuthField label="Prénom" value={firstName} onChangeText={setFirstName} />
        <AuthField label="Nom" value={lastName} onChangeText={setLastName} />
        <AuthField label="Date de naissance (AAAA-MM-JJ)" value={dob} onChangeText={setDob} />
        <ThemedText variant="footnote" color="label2" style={{ marginBottom: SPACING.space4 }}>
          En ajoutant votre enfant, vous confirmez être titulaire de l’autorité parentale et consentez,
          en son nom, au traitement de ces renseignements pour le suivi de son programme THRIVE.
          Ils ne sont accessibles qu’à son coach et à l’équipe THRIVE.
        </ThemedText>
        <AuthButton label={saving ? 'Enregistrement...' : 'Ajouter'} onPress={handleAdd} disabled={saving} />
      </Sheet>
    </ScrollView>
  );
}
