# Runbook — Actions sécurité manuelles (dashboard Supabase)

> Ces deux actions ne sont **pas automatisables** par migration ni par MCP : la première
> est un réglage Auth du dashboard, la seconde exige une application d'authentification
> physique (téléphone). Tout le reste du durcissement de juillet 2026 est déjà en prod.
>
> Projet : **THRIVE-CA** (`kkdcgzvdmipmrgkawnky`, ca-central-1)
> https://supabase.com/dashboard/project/kkdcgzvdmipmrgkawnky

## 1. Activer la protection « mots de passe compromis » (2 min)

1. Dashboard → **Authentication** → **Sign In / Providers** → section **Passwords**
   (selon la version du dashboard : Authentication → **Policies** ou **Passwords**).
2. Activer **« Prevent use of leaked passwords »** (vérification HaveIBeenPwned).
3. Recommandé au même endroit : longueur minimale **12 caractères**.

Effet : les mots de passe présents dans des fuites connues sont refusés à l'inscription
et au changement de mot de passe. Aucun impact sur les comptes existants tant qu'ils ne
changent pas de mot de passe.

**Vérification** : l'advisor `auth_leaked_password_protection` disparaît de
Dashboard → Advisors → Security (ou via MCP `get_advisors`).

## 2. Enrôler la MFA (TOTP) des 3 comptes admin (5 min / compte)

État au 2026-07-11 : **0 facteur enrôlé** sur les 3 comptes concernés :

| Compte | Rôle |
|---|---|
| <super-admin> | SUPER_ADMIN |
| <admin> | ADMIN |
| <admin> | ADMIN |

L'infrastructure est déjà en prod (branche `security/mfa-admin` mergée) :
- Page d'enrôlement : **`/settings/security`** (QR code TOTP).
- Step-up à la connexion : **`/mfa-verify`** (exigé pour la zone admin dès qu'un
  facteur est vérifié — garde `aal2`).
- Le facteur TOTP est activé côté projet Supabase (testé : enroll → QR OK).

Procédure par compte :
1. Se connecter à l'app avec le compte admin.
2. Aller sur `https://<app>/settings/security` → **Activer la double authentification**.
3. Scanner le QR avec Google Authenticator / 1Password / Authy.
4. Saisir le code à 6 chiffres pour vérifier le facteur.
5. Se déconnecter / reconnecter : la connexion doit exiger le code (`/mfa-verify`).

⚠️ **Ordre conseillé** : commencer par un compte ADMIN secondaire (pas le SUPER_ADMIN),
valider le cycle complet connexion + step-up, puis enrôler les deux autres. En cas de
perte du téléphone, un autre admin peut supprimer le facteur du compte bloqué via SQL
(`delete from auth.mfa_factors where user_id = …`) — d'où l'intérêt de ne jamais avoir
un seul admin enrôlé à la fois pendant la bascule.

**Vérification** :
```sql
select u.email, f.status, f.factor_type
from auth.users u join auth.mfa_factors f on f.user_id = u.id
where u.raw_app_meta_data->>'role' in ('ADMIN','SUPER_ADMIN');
```
→ 3 lignes `verified` / `totp` attendues.

## 3. (Optionnel, recommandé) Rate limits Auth

Dashboard → Authentication → **Rate Limits** : vérifier que les valeurs par défaut
(tentatives de connexion, envois d'e-mails) sont actives — les valeurs par défaut de
Supabase conviennent pour la volumétrie actuelle.
