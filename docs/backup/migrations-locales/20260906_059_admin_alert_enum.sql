-- ─────────────────────────────────────────────────────────────────────────────
-- 059 — Valeur d'enum « ADMIN_ALERT ».
--
-- Type porté par toutes les notifications du centre d'alertes administrateur
-- (migration 060) : tâche terminée, message d'équipe, mention, inscription,
-- demande de la liste d'attente, abonnement… Le détail de l'évènement vit dans
-- data.event / data.category, l'enum reste volontairement générique.
--
-- Migration séparée : PostgreSQL interdit d'UTILISER une valeur d'enum dans la
-- transaction qui l'ajoute. 059 ajoute, 060 s'en sert.
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.notification_type add value if not exists 'ADMIN_ALERT';
