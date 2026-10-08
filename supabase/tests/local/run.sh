#!/usr/bin/env bash
# Rejoue les tests de sécurité RLS sur un Postgres jetable, sans toucher à la prod.
#
#   1. base « avant » : réplique du schéma de prod + seed synthétique
#      → les tests DOIVENT échouer (preuve qu'ils détectent les failles) ;
#   2. base « après » : même chose + migrations 066, 067, puis 068 et 070 si
#      elles existent dans supabase/migrations
#      → les tests DOIVENT passer ;
#   3. si supabase/tests/access_matrix.sql existe, il est rejoué sur la base
#      « après » avec ON_ERROR_STOP : toute erreur fait échouer le script.
#      (Fichiers absents = ignorés avec un message, pas d'erreur.)
#
# Usage : PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres ./supabase/tests/local/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
migrations_dir="$root/supabase/migrations"
migration="$migrations_dir/20261001_066_security_audit_final.sql"
migration_067="$migrations_dir/20261002_067_require_email_confirmation.sql"
tests="$root/supabase/tests/security_rls_regression.sql"
access_matrix="$root/supabase/tests/access_matrix.sql"

# Migrations optionnelles (arrivent par d'autres branches) : résolues par numéro.
# Glob sans correspondance = chaîne littérale → on la rejette ici.
optional_migration() {
  local num="$1" f
  for f in "$migrations_dir"/*_"$num"_*.sql; do
    [[ -e "$f" ]] && { printf '%s\n' "$f"; return 0; }
  done
  return 1
}

extras=("$migration" "$migration_067")
for num in 068 070; do
  if f="$(optional_migration "$num")"; then
    echo "migration $num présente : $(basename "$f")"
    extras+=("$f")
  else
    echo "migration $num absente : ignorée"
  fi
done

run_case() {
  local db="$1"; shift
  dropdb --if-exists "$db" >/dev/null
  createdb "$db"
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$here/00_replica_schema.sql" -f "$here/01_seed.sql" >/dev/null
  for extra in "$@"; do psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$extra" >/dev/null; done
  # Le bloc de tests se termine toujours par une exception : on lit son message.
  psql -d "$db" -f "$tests" 2>&1 | grep -oE 'SECURITY_TESTS_(PASSED|FAILED|SKIPPED).*' || true
}

echo "── AVANT migration 066 (échec attendu) ──"
before="$(run_case thrive_sec_before)"
dropdb --if-exists thrive_sec_before >/dev/null
echo "$before"
echo

echo "── APRÈS migrations 066 + 067 (+ 068/070 si présentes) (succès attendu) ──"
after="$(run_case thrive_sec_after "${extras[@]}")"
echo "$after"
echo

access_status="absent (ignoré)"
if [[ -f "$access_matrix" ]]; then
  echo "── Matrice d'accès (supabase/tests/access_matrix.sql) ──"
  # Rejouée sur une base « après » fraîche, ON_ERROR_STOP : toute erreur = échec.
  dropdb --if-exists thrive_sec_matrix >/dev/null
  createdb thrive_sec_matrix
  psql -q -v ON_ERROR_STOP=1 -d thrive_sec_matrix -f "$here/00_replica_schema.sql" -f "$here/01_seed.sql" >/dev/null
  for extra in "${extras[@]}"; do psql -q -v ON_ERROR_STOP=1 -d thrive_sec_matrix -f "$extra" >/dev/null; done
  if psql -q -v ON_ERROR_STOP=1 -d thrive_sec_matrix -f "$access_matrix"; then
    access_status="OK"
  else
    access_status="ECHEC"
  fi
  dropdb --if-exists thrive_sec_matrix >/dev/null
  echo "matrice d'accès : $access_status"
  echo
fi
dropdb --if-exists thrive_sec_after >/dev/null

[[ "$before" == SECURITY_TESTS_FAILED* ]] || { echo "ERREUR : les tests ne détectent pas les failles d'origine" >&2; exit 1; }
[[ "$after" == SECURITY_TESTS_PASSED* ]]  || { echo "ERREUR : les migrations ne corrigent pas tout" >&2; exit 1; }
[[ "$access_status" != "ECHEC" ]]         || { echo "ERREUR : la matrice d'accès échoue sur la base corrigée" >&2; exit 1; }
echo "OK : failles reproduites avant, corrigées après (matrice d'accès : $access_status)."
