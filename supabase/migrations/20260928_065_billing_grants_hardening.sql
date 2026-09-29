-- 065 — Durcissement des droits sur billing_subscriptions (miroir RevenueCat).
--
-- La table n'est lisible par un parent que pour SA ligne (RLS) et n'est écrite
-- que par le service role (edge functions). Les privilèges par défaut de
-- Supabase laissaient toutefois TRUNCATE / REFERENCES / TRIGGER au rôle
-- authenticated : TRUNCATE n'est pas soumis à la RLS. Inaccessible via
-- PostgREST, mais on retire ce qui ne sert à rien (défense en profondeur).
--
-- Gardé par un test d'existence : sans effet si la migration 064 n'est pas
-- encore passée.

do $$
begin
  if to_regclass('public.billing_subscriptions') is not null then
    revoke truncate, references, trigger on public.billing_subscriptions from authenticated, anon;
    revoke insert, update, delete on public.billing_subscriptions from authenticated, anon;
  end if;
end $$;
