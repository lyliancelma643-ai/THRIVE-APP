-- ─────────────────────────────────────────────────────────────────────────────
-- Refonte coach — extensions d'enums.
--   session_status    : + POSTPONED (séance « reportée », distincte d'annulée)
--   notification_type : + types du système de vérification & du LSSS
-- NB : les nouvelles valeurs d'enum ne sont utilisables qu'après COMMIT de
-- cette migration — c'est pourquoi elles vivent dans leur propre fichier,
-- avant les migrations qui les référencent.
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.session_status add value if not exists 'POSTPONED';

alter type public.notification_type add value if not exists 'DOSSIER_INCOMPLET';
alter type public.notification_type add value if not exists 'QUESTIONNAIRE_PENDING';
alter type public.notification_type add value if not exists 'QUESTIONNAIRE_COMPLETED';
alter type public.notification_type add value if not exists 'DOCUMENT_ADDED';
