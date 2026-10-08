# Authentification — web, PWA et app mobile (A01, v1.0)

## Session
- **Web / PWA** : supabase-js (localStorage) + cookie `sb-access-token` lu par le middleware
  (`apps/web/src/middleware.ts`). Le cookie est écrit par `lib/auth-cookie.ts` :
  `Path=/; SameSite=Lax; Secure` (https), durée = expiration du JWT (renouvelé à chaque
  `TOKEN_REFRESHED`, `SIGNED_IN`, `MFA_CHALLENGE_VERIFIED`, `USER_UPDATED`).
  Il reste lisible en JS : le passer en HttpOnly demande la migration vers `@supabase/ssr`
  (cookies posés côté serveur) — **reportée en v1.1**, trop risquée avant la publication.
- **Mobile natif (Expo)** : `apps/mobile/src/lib/auth-storage.ts` dépose, dans
  `globalThis.__THRIVE_AUTH_STORAGE__` (lu par `packages/shared/src/lib/supabase.ts`),
  l'adaptateur `createSecureAuthStorage` (`secure-storage.ts`) :
  expo-secure-store (Keychain / Keystore, `AFTER_FIRST_UNLOCK`), session découpée en morceaux de
  1 800 car. (limite SecureStore ≈ 2 048 octets), clé de version `<clé>.v` = `v1:<n>`.
  Une lecture incohérente renvoie `null` (reconnexion), jamais un jeton tronqué.
  Les sessions déjà dans AsyncStorage sont migrées à la première lecture puis effacées.
- `apps/mobile/src/app/_layout.tsx` : `AppState` → `startAutoRefresh()` / `stopAutoRefresh()`.
  `react-native-url-polyfill/auto` est importé en tête de `auth-storage.ts` (premier import de `index.js`).
- **Pas de WebView** dans la coque actuelle (écrans natifs) : pas de jeton à transmettre.
  Si une WebView est ajoutée (A03), ne JAMAIS mettre le refresh token dans l'URL : poser le cookie
  `sb-access-token` sur le domaine prod et envoyer la session au web par message du pont, puis
  `supabase.auth.setSession()` côté page.

## Rôles
- Autorité unique : `app_metadata.role` (JWT). `lib/role-home.ts` : PARENT → `/parent/fitness`,
  COACH → `/coach/dashboard`, ADMIN/SUPER_ADMIN → `/admin`, autre (CHILD, vide) → `/compte-non-configure`
  (message + déconnexion). Middleware et layouts parent/coach/admin n'ont plus de rebond `/dashboard`.
- Mobile : rôle ni COACH ni PARENT → alerte + déconnexion ; ADMIN → renvoi vers le web.

## MFA
Le middleware lit le claim `aal` : si `aal1` et que le compte a un facteur vérifié (appel
`/auth/v1/user`, « sans facteur » mis en cache 5 min par isolat, échec réseau = on laisse passer car
le JWT est déjà vérifié), redirection vers `/mfa-verify?next=…`. Le cookie suit le passage en `aal2`.

## Inscription et consentement (Loi 25)
Case de consentement obligatoire (étape parent de `/login`). La preuve (`pendingConsent`) et les
enfants déclarés (`pendingChildren`) sont gardés dans `user_metadata` jusqu'à la première session
confirmée ; `finalizePendingSignup()` (`lib/pending-signup.ts`) écrit alors `consents`, crée les enfants
un par un (quota du forfait toléré), mémorise ceux qui manquent (`SIGNUP_MISSED_KEY`) et efface les
métadonnées. Mot de passe : règle `@thrive/shared` (12 car., minuscule + majuscule + chiffre).

## Co-parents
`admin-create-user` : un PARENT ne peut qu'**inviter** (`inviteUserByEmail`, lien → `/reset-password`),
quota `maxParents` vérifié avant création. L'admin crée des comptes confirmés avec mot de passe.

## Suppression de compte
`components/account/DeleteAccountSection` (parent : `/parent/compte` ; coach : `/coach/profil`) →
`request-account-deletion` (enregistre la demande, traitée sous 30 jours). Mobile :
`components/account/DeleteAccountRow`.
