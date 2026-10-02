#!/usr/bin/env bash
# Rejoue les tests RLS sur un Postgres 16 local, à partir du miroir de prod.
#   PGHOST=/tmp/thrive-pg PGPORT=55432 supabase/tests/rls/run-local.sh
# Pour chaque migration testée : base neuve → miroir (état AVANT) → migration →
# test. Avec --before, le test est joué SANS la migration (il doit échouer :
# preuve qu'il détecte bien le défaut corrigé).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../../.." && pwd)"
export PGUSER="${PGUSER:-postgres}"
export PGOPTIONS="-c client_min_messages=warning"
before=false; [[ "${1:-}" == "--before" ]] && before=true

run() { # $1 = nom du test, $2… = migrations à appliquer
  local name="$1"; shift
  local db="thrive_rls_${name}"
  dropdb --if-exists "$db"; createdb "$db"
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$here/mirror_schema.sql" >/dev/null
  if ! $before; then
    for m in "$@"; do psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$repo/supabase/migrations/$m" >/dev/null; done
  fi
  if $before; then
    # Sans la migration, le test DOIT échouer : on affiche le premier contrôle en défaut.
    if psql -q -v ON_ERROR_STOP=1 -At -d "$db" -f "$here/${name}.test.sql" >/dev/null 2>"$db.err"; then
      echo "ANOMALIE : ${name} passe sans sa migration"; dropdb "$db"; rm -f "$db.err"; exit 1
    fi
    echo "${name} sans migration → $(grep -m1 -o 'ÉCHEC.*' "$db.err" || head -1 "$db.err")"
    rm -f "$db.err"
  else
    psql -q -v ON_ERROR_STOP=1 -At -d "$db" -f "$here/${name}.test.sql" | grep -E '^OK :'
  fi
  dropdb "$db"
}

run 066_coparent_access 20261002_066_coparent_access.sql
run 067_deletion_requests_workflow 20261002_067_deletion_requests_workflow.sql
