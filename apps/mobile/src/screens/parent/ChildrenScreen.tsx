import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseClient as supabase, useChildren, useFamily } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { useChildStore } from '../../stores/child.store';
import { OfflineState } from '../../components/OfflineState';
import { ChildrenListView } from '../../components/account/ChildrenListView';
import { AGE_MAX, AGE_MIN, ChildrenSetupView, type ChildDraft } from '../../components/account/ChildrenSetupView';
import { useTheme } from '../../design';

function calculateAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/** Date de naissance approchée à partir de l'âge choisi au stepper : aujourd'hui − âge ans − 7 jours (AAAA-MM-JJ). */
function dobFromAge(age: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - age);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

let draftSeq = 0;
const newDraft = (): ChildDraft => ({ key: `d${++draftSeq}`, firstName: '', age: 11, sport: '' });

/**
 * Mes enfants / Inscription · les enfants (maquette D). Sans enfant : étape « 2 sur 2 » de l'inscription.
 * Avec des enfants : liste, puis « Ajouter un enfant » ouvre le même formulaire (sans étape).
 * Mêmes données qu'avant : table `children` (prénom, nom du parent, date de naissance, `sport`), famille créée au besoin.
 */
export default function ChildrenScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { colors } = useTheme();
  const { family, isLoading: familyLoading, error: familyError, refetch: refetchFamily, createFamily } = useFamily(user?.id);
  const { children, isLoading, error: childrenError, refetch: refetchChildren, deleteChild } = useChildren(family?.id);

  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<ChildDraft[]>(() => [newDraft()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(parent)/profile'));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      // `createChild` du hook lit l'identifiant de famille du rendu précédent : on insère donc avec l'identifiant frais.
      const familyId = family?.id ?? (await createFamily(`Famille ${user?.lastName ?? ''}`.trim())).id;
      const rows = drafts.map((d) => ({
        family_id: familyId,
        first_name: d.firstName.trim(),
        last_name: user?.lastName ?? '',
        date_of_birth: dobFromAge(d.age),
        sport: d.sport || null,
      }));
      const { error: insertError } = await supabase.from('children').insert(rows);
      if (insertError) throw new Error(insertError.message);
      await refetchChildren();
      if (user?.id) await useChildStore.getState().loadChildren(user.id);
      setDrafts([newDraft()]);
      if (children.length === 0 && !adding) router.replace('/(parent)/maison');
      else setAdding(false);
    } catch (e) {
      setError((e as Error)?.message ?? 'Enregistrement impossible. Réessaie.');
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

  if (children.length > 0 && !adding) {
    return (
      <ChildrenListView
        childrenList={children.map((c) => ({
          id: c.id,
          firstName: c.first_name,
          age: calculateAge(c.date_of_birth),
          sport: (c as { sport?: string | null }).sport ?? null,
          badges: (c.child_badges ?? []).map((cb) => cb.badges.name),
        }))}
        onOpen={(childId) => router.push({ pathname: '/(parent)/badges', params: { childId } })}
        onAdd={() => setAdding(true)}
        onBack={goBack}
        onDelete={async (childId) => {
          // Archivage (is_active = false, autorisé au parent par la RLS) : l'enfant disparaît de tout l'espace.
          await deleteChild(childId);
          if (user?.id) await useChildStore.getState().loadChildren(user.id);
        }}
      />
    );
  }

  const onboarding = children.length === 0;
  return (
    <ChildrenSetupView
      drafts={drafts}
      onChange={(key, patch) => setDrafts((all) => all.map((d) => (d.key === key ? { ...d, ...patch, age: Math.min(AGE_MAX, Math.max(AGE_MIN, patch.age ?? d.age)) } : d)))}
      onAdd={() => setDrafts((all) => [...all, newDraft()])}
      onRemove={(key) => setDrafts((all) => (all.length > 1 ? all.filter((d) => d.key !== key) : all))}
      onContinue={save}
      onBack={onboarding ? goBack : () => setAdding(false)}
      step={onboarding ? { index: 2, total: 2 } : undefined}
      canContinue={drafts.length > 0 && drafts.every((d) => d.firstName.trim().length > 0)}
      loading={saving}
      error={error}
    />
  );
}
