-- ─────────────────────────────────────────────────────────────────────────────
-- 036 — Valeur d'enum pour les notifications de tâches roadmap.
-- Séparée de la 037 : une nouvelle valeur d'enum ne peut pas être UTILISÉE
-- dans la transaction qui la crée (les triggers de la 037 s'en servent).
-- ─────────────────────────────────────────────────────────────────────────────
alter type notification_type add value if not exists 'TASK_UPDATE';
