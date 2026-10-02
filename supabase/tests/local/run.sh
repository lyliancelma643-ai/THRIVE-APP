#!/usr/bin/env bash
# Rejoue les tests de sécurité RLS sur un Postgres jetable, sans toucher à la prod.
#
#   1. base « avant » : réplique du schéma de prod + seed synthétique
#      → les tests DOIVENT échouer (preuve qu'ils détectent les failles) ;
#   2. base « après » : même chose + migration 066
#      → les tests DOIVENT passer.
#
# Usage : PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres ./supabase/tests/local/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
migration="$root/supabase/migrations/20261001_066_security_audit_final.sql"
migration_067="$root/supabase/migrations/20261002_067_require_email_confirmation.sql"
tests="$root/supabase/tests/security_rls_regression.sql"

run_case() {
  local db="$1"; shift
  dropdb --if-exists "$db" >/dev/null
  createdb "$db"
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$here/00_replica_schema.sql" -f "$here/01_seed.sql" >/dev/null
  for extra in "$@"; do psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$extra" >/dev/null; done
  # Le bloc de tests se termine toujours par une exception : on lit son message.
  psql -d "$db" -f "$tests" 2>&1 | grep -oE 'SECURITY_TESTS_(PASSED|FAILED|SKIPPED).*' || true
  dropdb "$db"
}

echo "── AVANT migration 066 (échec attendu) ──"
before="$(run_case thrive_sec_before)"
echo "$before"
echo
echo "── APRÈS migrations 066 + 067 (succès attendu) ──"
after="$(run_case thrive_sec_after "$migration" "$migration_067")"
echo "$after"

[[ "$before" == SECURITY_TESTS_FAILED* ]] || { echo "ERREUR : les tests ne détectent pas les failles d'origine" >&2; exit 1; }
[[ "$after" == SECURITY_TESTS_PASSED* ]]  || { echo "ERREUR : la migration 066 ne corrige pas tout" >&2; exit 1; }
echo
echo "OK : failles reproduites avant, corrigées après."
