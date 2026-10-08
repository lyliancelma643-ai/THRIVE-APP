#!/usr/bin/env bash
# Applique supabase/config.toml (Auth, API, fonctions) à un projet distant.
# Toujours dans cet ordre : STAGING, vérification, puis PRODUCTION.
#
# Prérequis : jeton personnel Supabase (Dashboard › Account › Access Tokens),
# jamais commité :  export SUPABASE_ACCESS_TOKEN=sbp_...
#
# Usage :
#   scripts/ops/supabase-config-push.sh <project-ref>          # diff + confirmation
#   scripts/ops/supabase-config-push.sh <project-ref> --hibp   # + mots de passe compromis (plan Pro)
#
# `supabase config push` affiche les différences et demande confirmation avant
# d'écrire : relire chaque ligne. Retour arrière : `git revert` du commit de
# config, puis relancer ce script (la configuration précédente est réappliquée).
set -euo pipefail

REF="${1:?Usage : $0 <project-ref> [--hibp]}"
HIBP="${2:-}"
PROD_REF="kkdcgzvdmipmrgkawnky"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN manquant (Dashboard › Account › Access Tokens)}"
cd "$(dirname "$0")/../.."

if [[ "$REF" == "$PROD_REF" ]]; then
  echo "⚠️  Cible : PRODUCTION ($PROD_REF)."
  read -r -p "La même config a-t-elle été appliquée et testée sur staging ? (oui/non) " ok
  [[ "$ok" == "oui" ]] || { echo "Abandon."; exit 1; }
fi

npx -y supabase@latest config push --project-ref "$REF"

if [[ "$HIBP" == "--hibp" ]]; then
  # Protection « mots de passe compromis » (HaveIBeenPwned) : plan Pro requis,
  # non pilotable par config.toml → Management API.
  curl -fsS -X PATCH "https://api.supabase.com/v1/projects/$REF/config/auth" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"password_hibp_enabled": true}' >/dev/null
  echo "✔ Protection des mots de passe compromis activée sur $REF"
fi

echo
echo "Vérifications :"
echo "  1. Inscription avec 'motdepasse1' → refusée ; avec 'Soleil2026Maison' → acceptée."
echo "  2. Connexion d'un compte existant → OK (les anciens mots de passe restent valides)."
echo "  3. Advisors sécurité : 'auth_leaked_password_protection' disparaît (si --hibp)."
