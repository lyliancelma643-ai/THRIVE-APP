# Tests E2E mobiles (Maestro)

Flux `parent-paywall-restore.yaml` : connexion, onglet Maison, paywall, « Restaurer les achats ».
Cible : build de développement `app.thrive.mobile` installé sur un simulateur/émulateur
(Expo Go non supporté : RevenueCat natif).

    brew install maestro            # ou: curl -Ls "https://get.maestro.mobile.dev" | bash
    maestro test -e PASSWORD='<mot de passe>' .maestro/parent-paywall-restore.yaml

`EMAIL` vaut par défaut `parent-abonnement@thrivesportpositive.com` (surcharge : `-e EMAIL=...`).
Ne jamais écrire le mot de passe dans un fichier. Les libellés viennent de
`apps/mobile/src` (login, `(parent)/_layout`, `maison`, `Paywall`).
