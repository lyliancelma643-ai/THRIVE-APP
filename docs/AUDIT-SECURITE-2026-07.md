# Audit de sécurité THRIVE — application réelle (2026-07-06)

Audit du codebase `thrive APP` contre le [guide AppSec](SECURITE-GUIDE-APPSEC.md).
Périmètre : app web Next.js (`apps/web`), base Supabase prod **THRIVE-CA** (`kkdcgzvdmipmrgkawnky`), config git/env.

---

## 1. Corrections appliquées dans ce commit (code, réversible)

| # | Finding | Sévérité | Fichier | Correction |
|---|---|---|---|---|
| 1 | **Aucun en-tête de sécurité HTTP** (pas de CSP, HSTS, anti-clickjacking, nosniff…) | Élevée | `apps/web/next.config.js` | Ajout de `headers()` : CSP fonctionnelle (Supabase + Wistia autorisés, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), HSTS 2 ans, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. **Vérifié : 0 violation CSP, l'app (login + bilan) rend correctement.** |
| 2 | **Escalade de privilèges verticale** : le middleware retombait sur `user_metadata.role`, champ **modifiable par l'utilisateur** (`auth.updateUser`), pour autoriser l'accès à `/admin`, `/coach`, `/parent` | Élevée | `apps/web/src/middleware.ts` | Autorité **unique** = `app_metadata.role` (posé par edge function via service key, non modifiable). Fallback supprimé. |
| 3 | **Fichiers `.env` versionnés** (`apps/mobile/.env`, `apps/web/.env.local`) | Faible | git index | `git rm --cached` (déjà couverts par `.gitignore`). ⚠️ Ne contenaient que des **clés publiques** (`ANON_KEY`, URL) — aucun secret réel exposé. |

> Ces changements sont dans l'arbre de travail (non commités). Relis-les puis commit/déploie quand tu veux. Le déploiement Vercel sur `main` est automatique.

---

## 2. Points vérifiés — CONFORMES (aucune action requise)

- **Contrôle d'accès en base (le contrôle critique)** : il n'y a pas de routes API ; tout passe par des RPC Supabase `SECURITY DEFINER`. **Chaque fonction sensible vérifie l'autorisation en interne** :
  - `dossier_completeness`, `lsss_progression` → `private.can_view_child_bilan(p_child)`
  - `lsss_send` → `private.can_edit_child_bilan(p_child)`
  - `list_dossiers` → filtre `is_super_admin()` / supervision admin→coach / `coach_id = auth.uid()`
  - `notify_incomplete_dossiers` → `is_admin`/`is_super_admin` + scope supervision
  - `lsss_get` / `lsss_submit` → accès par **token UUID** (122 bits) + expiration + statut ; `anon` par design (questionnaire enfant sans compte). ✅ Pas d'IDOR.
- **XSS du bilan** : le rendu HTML (`dangerouslySetInnerHTML` dans `bilans/page.tsx`) échappe **tous** les champs texte libre via `esc()` (`smartGoal`, `letter`, `sportStory`, `toolbox`, `strengths`, `firstName`…). Attributs en guillemets doubles ⇒ `esc` (`& < > "`) suffisant. ✅ Pas de XSS stocké exploitable.
- **`service_role`** : jamais référencée côté web, jamais dans `NEXT_PUBLIC_*`. ✅
- **Dépendances** : `npm audit --omit=dev` → **0 vulnérabilité**. ✅
- **Rôle applicatif** : `app_metadata.role` non auto-modifiable, `profiles.role` verrouillé (déjà en place). ✅

---

## 3. Recommandations restantes (nécessitent TON OK — config prod)

| Action | Où | Pourquoi | Effort |
|---|---|---|---|
| **Activer « Leaked Password Protection »** | Supabase → Auth → Password | Advisor WARN : bloque les mots de passe fuités (HaveIBeenPwned). Aligné guide §3.1 | 1 clic |
| **Activer le MFA** (au moins pour ADMIN/SUPER_ADMIN) | Supabase Auth (TOTP) | Guide §3.2 — comptes à privilèges + accès données de mineurs | Faible |
| **Rate limiting sur `/q/[token]`** (edge/Vercel) | Vercel | Défense en profondeur sur `lsss_submit` (écriture anon). Guide §5.3 | Moyen |
| **`dossier_reminders` : RLS active sans policy** | Supabase | Actuellement *deny-all* (sûr) — accédée seulement via SECURITY DEFINER. Confirmer que c'est voulu ; sinon ajouter une policy explicite. Advisor INFO | Faible |
| **Durcir la CSP `script-src`** | `next.config.js` | Passer à une CSP à base de **nonce** (retirer `unsafe-inline`/`unsafe-eval`) via middleware Next. Guide §2.3 | Moyen |
| **Notification de violation** (RGPD/Loi 25) | Process | Runbook écrit : 72 h autorité + CAI. Guide §8.4 | Doc |

---

## 4. Advisors Supabase — interprétation

Les WARN `*_security_definer_function_executable` sont des **artefacts attendus** du pattern « RPC `SECURITY DEFINER` + vérification d'autorisation interne » — ils signalent des fonctions à *revoir*, pas des failles. Revue faite ci-dessus (§2) : autorisation correcte dans chaque fonction. Rien à corriger côté DB.

Réf. remediation : <https://supabase.com/docs/guides/database/database-linter>
