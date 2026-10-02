-- Rapatriée de la production (version 20260906183505 « admin_alert_enum »).
-- 059 — Valeur d'enum « ADMIN_ALERT » (centre d'alertes administrateur, mig. 060).
alter type public.notification_type add value if not exists 'ADMIN_ALERT';
