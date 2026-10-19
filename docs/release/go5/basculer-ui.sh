#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Bascule l'interface de l'app entre :
#   • l'ANCIENNE UI (main avant iOS 27, gardée sur la branche archive/ui-avant-ios27)
#   • la NOUVELLE UI Lin / Veillée (fusionnée dans main, tag ui-lin-veillee-fusion)
#
#   pnpm ui:etat       → dit quelle UI est active sur main
#   pnpm ui:ancienne   → remet l'ancienne UI sur main (un commit, réversible)
#   pnpm ui:nouvelle   → remet la nouvelle UI sur main (un commit, réversible)
#   pnpm ui:voir-ancienne → ouvre l'ancienne version telle quelle (branche d'archive), sans toucher main
#
# Rien n'est poussé, rien n'est effacé de l'historique : chaque bascule est un
# commit « Revert » ordinaire, qu'on peut lui-même annuler.
# La base de données n'est pas touchée : si des migrations de la nouvelle UI ont
# été appliquées en production, elles y restent (voir docs/release/RETOUR_ANCIENNE_UI.md).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ARCHIVE_BRANCH="archive/ui-avant-ios27"
FUSION_TAG="ui-lin-veillee-fusion"
MARK_OLD="ui: retour à l’ancienne UI (avant iOS 27)"
MARK_NEW="ui: retour à la nouvelle UI (Lin et Veillée)"
PROBE="apps/mobile/src/design/ThemeProvider.tsx"   # n'existe que dans la nouvelle UI

cd "$(git rev-parse --show-toplevel)"
cmd="${1:-etat}"

die() { printf '✗ %s\n' "$*" >&2; exit 1; }
ok()  { printf '✓ %s\n' "$*"; }

active() { if git cat-file -e "main:$PROBE" 2>/dev/null; then echo nouvelle; else echo ancienne; fi; }

need_clean_main() {
  [ "$(git branch --show-current)" = "main" ] || die "Place-toi d’abord sur main : git switch main"
  [ -z "$(git status --porcelain --untracked-files=no)" ] || die "Des modifications ne sont pas enregistrées. Fais un commit (ou git stash) puis relance."
  git rev-parse -q --verify "refs/tags/$FUSION_TAG" >/dev/null || die "Tag $FUSION_TAG introuvable : la nouvelle UI n’a pas été fusionnée par le GO 5."
}

revert_or_abort() { # $1 = commit, $2 = message, $3… = options de revert
  local target="$1" msg="$2"; shift 2
  if git revert --no-commit "$@" "$target"; then
    git commit -q -m "$msg" -m "Bascule faite par scripts/ui/basculer-ui.sh (annule $target)."
  else
    git revert --abort || true
    die "Conflit pendant la bascule (des commits récents touchent les mêmes fichiers). Rien n’a changé. Pour lancer l’ancienne version quand même : pnpm ui:voir-ancienne"
  fi
}

case "$cmd" in
  etat)
    echo "UI active sur main : $(active)"
    git rev-parse -q --verify "refs/heads/$ARCHIVE_BRANCH" >/dev/null && ok "Archive présente : $ARCHIVE_BRANCH" || echo "! Archive $ARCHIVE_BRANCH absente"
    ;;
  ancienne)
    need_clean_main
    [ "$(active)" = "ancienne" ] && { ok "L’ancienne UI est déjà active."; exit 0; }
    last_new=$(git log main --format=%H --fixed-strings --grep="$MARK_NEW" -n1 || true)
    if [ -n "$last_new" ]; then
      revert_or_abort "$last_new" "$MARK_OLD"        # annule le dernier « retour à la nouvelle UI »
    else
      revert_or_abort "$(git rev-list -n1 "$FUSION_TAG")" "$MARK_OLD" -m 1   # annule la fusion
    fi
    ok "Ancienne UI remise sur main (commit $(git rev-parse --short HEAD)). Pour revenir : pnpm ui:nouvelle"
    ;;
  nouvelle)
    need_clean_main
    [ "$(active)" = "nouvelle" ] && { ok "La nouvelle UI est déjà active."; exit 0; }
    last_old=$(git log main --format=%H --fixed-strings --grep="$MARK_OLD" -n1 || true)
    [ -n "$last_old" ] || die "Aucun retour à l’ancienne UI trouvé dans main : rien à annuler."
    revert_or_abort "$last_old" "$MARK_NEW"
    ok "Nouvelle UI remise sur main (commit $(git rev-parse --short HEAD)). Pour revenir : pnpm ui:ancienne"
    ;;
  voir-ancienne)
    [ -z "$(git status --porcelain --untracked-files=no)" ] || die "Des modifications ne sont pas enregistrées. Fais un commit (ou git stash) puis relance."
    git switch "$ARCHIVE_BRANCH"
    ok "Tu es sur l’ancienne version telle qu’elle était ($ARCHIVE_BRANCH). Pour revenir : git switch main"
    ;;
  *)
    die "Commande inconnue : $cmd (etat | ancienne | nouvelle | voir-ancienne)"
    ;;
esac
