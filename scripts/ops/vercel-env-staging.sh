#!/usr/bin/env bash
# Pose les variables du projet Supabase de STAGING sur l'environnement
# **Preview** de Vercel (tous les déploiements de branche), pour que les
# Preview n'écrivent plus jamais dans la base de production.
#
# Prérequis : Vercel CLI connectée (`npx vercel login`) avec accès à l'équipe,
# projet Supabase de staging créé (ACTION 3 du rapport CTRL 5).
#
# Usage :
#   export STAGING_SUPABASE_URL=https://<ref-staging>.supabase.co
#   export STAGING_SUPABASE_ANON_KEY=...          # clé publique (anon / publishable)
#   export STAGING_SENTRY_DSN=...                 # optionnel
#   scripts/ops/vercel-env-staging.sh            # --dry-run pour seulement afficher
#
# Les valeurs passent par stdin (jamais en argument : invisibles dans `ps` et
# l'historique). --force remplace une valeur Preview existante.
# Retour arrière : `npx vercel env rm <NOM> preview --yes` pour chaque nom, puis
# redéployer un Preview ; la Production n'est jamais touchée par ce script.
set -euo pipefail

TEAM="${VERCEL_SCOPE:-lyliancelma643-ais-projects}"
PROJECT="${VERCEL_PROJECT:-thrive-app}"
PROD_REF="kkdcgzvdmipmrgkawnky"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

: "${STAGING_SUPABASE_URL:?STAGING_SUPABASE_URL manquant}"
: "${STAGING_SUPABASE_ANON_KEY:?STAGING_SUPABASE_ANON_KEY manquant}"

if [[ "$STAGING_SUPABASE_URL" == *"$PROD_REF"* ]]; then
  echo "✋ STAGING_SUPABASE_URL pointe sur la PRODUCTION ($PROD_REF). Abandon." >&2
  exit 1
fi
if [[ ! "$STAGING_SUPABASE_URL" =~ ^https://[a-z0-9]{20}\.supabase\.co$ ]]; then
  echo "✋ URL inattendue : $STAGING_SUPABASE_URL (attendu https://<ref>.supabase.co)." >&2
  exit 1
fi

declare -A VARS=(
  [NEXT_PUBLIC_SUPABASE_URL]="$STAGING_SUPABASE_URL"
  [NEXT_PUBLIC_SUPABASE_ANON_KEY]="$STAGING_SUPABASE_ANON_KEY"
)
[[ -n "${STAGING_SENTRY_DSN:-}" ]] && VARS[NEXT_PUBLIC_SENTRY_DSN]="$STAGING_SENTRY_DSN"

for name in "${!VARS[@]}"; do
  if (( DRY_RUN )); then
    echo "[dry-run] $name → preview (${#VARS[$name]} caractères)"
    continue
  fi
  printf '%s' "${VARS[$name]}" | npx -y vercel@latest env add "$name" preview \
    --project "$PROJECT" --scope "$TEAM" --force --yes --non-interactive
  echo "✔ $name posé sur Preview"
done

echo
echo "Vérification (noms seulement, valeurs chiffrées) :"
(( DRY_RUN )) || npx -y vercel@latest env ls preview --project "$PROJECT" --scope "$TEAM"
echo "Ensuite : pousser une branche et vérifier dans le Preview que les appels partent vers $STAGING_SUPABASE_URL."
