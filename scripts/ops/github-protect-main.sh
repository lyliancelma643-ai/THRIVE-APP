#!/usr/bin/env bash
# Protection de la branche `main` : PR obligatoire, CI verte obligatoire
# (les 3 jobs de .github/workflows/ci.yml, sous leur nom affiché — c'est ce
# nom que GitHub attend comme « context »), aucun contournement, même admin.
#
# Prérequis : `gh auth login` avec un compte administrateur du dépôt.
# Usage : scripts/ops/github-protect-main.sh
#
# Approbations requises : 0 — le dépôt n'a qu'un mainteneur ; en exiger une
# bloquerait toute fusion (GitHub interdit d'approuver sa propre PR). Passer à 1
# dès qu'un second relecteur existe.
# Retour arrière : gh api --method DELETE repos/$REPO/branches/main/protection
set -euo pipefail

REPO="${REPO:-lyliancelma643-ai/THRIVE-APP}"

gh api --method PUT "repos/$REPO/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Typecheck · Lint · Build (web)",
      "Playwright (parcours vitaux)",
      "Deno (webhook Stripe)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON

echo "✔ Protection posée. État actuel :"
gh api "repos/$REPO/branches/main/protection" \
  --jq '{checks: .required_status_checks.contexts, strict: .required_status_checks.strict, admins: .enforce_admins.enabled, pr: (.required_pull_request_reviews != null), force_push: .allow_force_pushes.enabled}'
