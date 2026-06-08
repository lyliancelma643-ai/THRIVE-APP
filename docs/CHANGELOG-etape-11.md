# Changelog — Étape 11 : Onboarding & Profil

> Branche : `feat/onboarding-profile`  
> Date : 2026-06-08  
> Statut : ✅ Commit de réconciliation appliqué

---

## Résumé

Cette étape implémente le **flow de première connexion** pour les coachs et les parents. Dès qu'un utilisateur se connecte pour la première fois, il est redirigé vers un wizard guidé (4 étapes) qui lui permet de compléter son profil avant d'accéder au tableau de bord.

---

## Fichiers créés

### `packages/shared/src/hooks/useOnboarding.ts`
- Lit `onboarding_completed` sur la table `profiles`.
- Expose `markOnboardingDone()` : met le flag à `true` en DB.
- Gère les états `loading` / `error`.
- Utilisé par `_layout.tsx` (guard) et par l'écran de confirmation du wizard.

### `apps/mobile/app/(parent)/onboarding.tsx`
- Wizard 4 étapes pour les parents :
  - Étape 0 : écran de bienvenue + présentation des features
  - Étape 1 : nom, téléphone
  - Étape 2 : prénom de l'enfant, tranche d'âge, niveau sportif
  - Étape 3 : récapitulatif + appel à `markOnboardingDone()` + redirection dashboard
- Animations slide left/right via `Animated.timing` (useNativeDriver: true).
- Accent couleur vert émeraude (`#10b981`) pour différencier visuellement du flow coach (indigo).

### `supabase/migrations/20260608_onboarding_flag.sql`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE`
- Index partiel sur `(id, onboarding_completed)` pour les guards fréquents.
- Compatible avec les politiques RLS existantes.

### `docs/CHANGELOG-etape-11.md`
- Ce fichier.

---

## Fichiers modifiés

### `apps/mobile/app/_layout.tsx`
- **Guard onboarding** : si `onboardingCompleted === false`, redirige vers `/(role)/onboarding`.
- Conserve le handler Notifications et la navigation sur tap de notification existants.
- Import de `useOnboarding` depuis `@thrive/shared`.

### `packages/shared/src/index.ts`
- Ajout de `export * from './hooks/useOnboarding'`.
- Réorganisation par catégories (Auth / Profile & Onboarding / Data / Communication / Features).

---

## Fichiers déjà présents (non modifiés)

| Fichier | Contenu |
|---|---|
| `apps/mobile/app/(coach)/onboarding.tsx` | Wizard coach 4 étapes — bienvenue, profil, spécialités, confirmation |
| `apps/mobile/app/(coach)/profile.tsx` | Écran profil coach éditable |
| `apps/mobile/app/(parent)/profile.tsx` | Écran profil parent éditable |
| `packages/shared/src/hooks/useProfile.ts` | `updateProfile`, `completeOnboarding`, `useProfile` |

---

## Contrat d'interface

```ts
// useOnboarding
function useOnboarding(userId: string | undefined): {
  loading: boolean;
  onboardingCompleted: boolean | null;
  markOnboardingDone: () => Promise<void>;
  error: string | null;
};
```

---

## Tests manuels à valider

- [ ] Nouveau coach → redirigé vers `/(coach)/onboarding` à la première connexion
- [ ] Nouveau parent → redirigé vers `/(parent)/onboarding` à la première connexion
- [ ] Après completion du wizard → `onboarding_completed = true` en DB
- [ ] Reconnexion après onboarding → accès direct au dashboard (pas de redirect)
- [ ] Retour en arrière dans le wizard (bouton ←) fonctionne aux étapes 1 et 2
- [ ] "Passer cette étape" sur l'étape 2 parent fonctionne
- [ ] Animation slide fonctionne sur iOS et Android
- [ ] Migration SQL idempotente (`ADD COLUMN IF NOT EXISTS`)

---

## Prochaine étape

Étape 12 → **Paramètres & Profil utilisateur** (modifier photo, changer mot de passe, gérer notifications, supprimer compte).
