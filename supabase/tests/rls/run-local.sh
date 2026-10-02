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
before=false; [[ "${1:-}" == "--before" ]] && before=true

run() { # $1 = nom du test, $2… = migrations à appliquer
  local name="$1"; shift
  local db="thrive_rls_${name}"
  dropdb --if-exists "$db"; createdb "$db"
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$here/mirror_schema.sql" >/dev/null
  if ! $before; then
    for m in "$@"; do psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$repo/supabase/migrations/$m" >/dev/null; done
  fi
  psql -q -v ON_ERROR_STOP=1 -At -d "$db" -f "$here/${name}.test.sql"
  dropdb "$db"
}

run 066_coparent_access 20261002_066_coparent_access.sql
