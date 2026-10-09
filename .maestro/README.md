# Tests E2E mobiles (Maestro)

| Flux | Rôle | Secret |
|---|---|---|
| `parent-paywall-restore.yaml` | connexion, onglet Maison, Profil, paywall, « Restaurer les achats », alerte de résultat | `PASSWORD` |
| `connexion-erreur.yaml` | mauvais mot de passe : message d'erreur affiché, pas de redirection | aucun |

Cible : build de développement `app.thrive.mobile` installé sur un simulateur/émulateur
(Expo Go non supporté : RevenueCat natif).

    brew install maestro            # ou: curl -Ls "https://get.maestro.mobile.dev" | bash
    maestro test -e PASSWORD='<mot de passe>' .maestro/parent-paywall-restore.yaml
    maestro test .maestro/connexion-erreur.yaml

`EMAIL` vaut par défaut `parent-abonnement@thrivesportpositive.com` (surcharge : `-e EMAIL=...`).
Ce compte doit être un parent SANS abonnement actif. Ne jamais écrire le mot de passe dans un fichier.

## Sélecteurs (testID)

Les flux ciblent des `testID` stables (`id:`), avec repli texte pour les onglets :

- `login-email`, `login-password`, `login-submit`, `login-error` — `apps/mobile/src/app/(auth)/login.tsx`
- `tab-maison`, `tab-profil` — `tabBarButtonTestID` dans `apps/mobile/src/app/(parent)/_layout.tsx`
- `subscription-discover`, `subscription-restore` — `components/subscription/SubscriptionSettings.tsx`
- `paywall`, `paywall-restore` — `components/subscription/Paywall.tsx`

L'assertion finale attend l'un des trois titres d'alerte exacts de `Paywall.onRestore` :
« Achats restaurés », « Aucun achat trouvé », « Restauration impossible ».

## CI

Le job `maestro-flows` (`.github/workflows/ci.yml`) valide uniquement la syntaxe YAML des flux
(pas d'exécution : aucun simulateur en CI). Il est `continue-on-error`.
