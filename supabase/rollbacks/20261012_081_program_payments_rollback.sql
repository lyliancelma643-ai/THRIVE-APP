-- ─────────────────────────────────────────────────────────────────────────────
-- Retour arrière de 081 (programmes payés par Stripe).
--
-- Garde-fou : des versements PAYÉS sont des pièces comptables. Le rollback
-- refuse de les détruire, sauf si l'opérateur l'assume explicitement, dans la
-- MÊME session, après export :
--     set thrive.force_rollback_081 = 'on';
--
-- Les packs ouverts par Stripe (pack_enrollments, source = 'stripe') sont
-- CONSERVÉS : personne ne perd son accès (à terminer par admin_end_pack au besoin).
-- 071 et 080 ne sont pas touchées.
-- ─────────────────────────────────────────────────────────────────────────────

set lock_timeout = '5s';

do $$
begin
  if to_regclass('public.program_installments') is not null
     and exists (select 1 from public.program_installments where status in ('payee', 'remboursee'))
     and coalesce(current_setting('thrive.force_rollback_081', true), '') <> 'on' then
    raise exception 'Rollback 081 refusé : versements payés présents (exporter puis set thrive.force_rollback_081 = ''on'')';
  end if;
end $$;

drop trigger if exists trg_program_installment_on_session7 on public.sessions;
drop function if exists private.program_on_session_completed();

drop function if exists public.program_record_installment_link(uuid, text, text, timestamptz, text);
drop function if exists public.program_apply_stripe_event(text, text, jsonb);
drop function if exists private.program_after_payment(uuid, integer);
drop function if exists public.program_create_order(uuid, text, text, integer, text);
drop function if exists private.program_has_active_pack(uuid);
drop function if exists private.program_notify(text, text, text, jsonb);

drop table if exists public.program_installments;
drop table if exists public.program_orders;
drop table if exists public.stripe_processed_events;

drop function if exists private.program_qc_tax(integer);
drop function if exists private.program_installment_ht(text, text, integer);
drop function if exists private.program_total_ht(text);

reset lock_timeout;
