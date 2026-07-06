# Guide de sécurité applicative de A à Z (AppSec / DevSecOps)

**Public visé :** fondateur-développeur d'une plateforme SaaS de coaching sportif (web + mobile éventuel), stack moderne type **Next.js / Supabase / API REST-GraphQL / Vercel**.
**Objectif :** guide opérationnel exhaustif, aligné **OWASP Top 10 (2021 + tendances 2025)**, **OWASP ASVS**, **OWASP Secure Coding Practices** et **NIST SSDF**, utilisable directement comme documentation projet et check-list.

> **Convention de lecture**
> - 🔴 **Mauvaise pratique** = anti-pattern à bannir.
> - 🟢 **Bonne pratique** = version corrigée à appliquer.
> - Les exemples de code sont volontairement génériques (pseudo-JS/SQL) et ne contiennent **aucun secret réel**.

---

## 1. Vue d'ensemble

### 1.1 Pourquoi penser la sécurité dès le départ (shift-left)

La sécurité n'est pas une couche que l'on ajoute à la fin : c'est une **propriété de conception**. Corriger une faille en production coûte 10 à 100× plus cher qu'en phase de conception, et une fuite de données de santé/PII sur une plateforme de coaching peut être fatale (RGPD, Loi 25 au Québec, réputation, confiance des utilisateurs).

**Shift-left** = déplacer les contrôles de sécurité le plus tôt possible dans le cycle de vie :
- On **modélise les menaces** dès la conception (threat modeling).
- On **écrit du code sécurisé** par défaut (validation, encodage, moindre privilège).
- On **automatise les tests de sécurité** dans le pipeline CI/CD (DevSecOps).
- On **surveille et on répond** aux incidents en production.

La sécurité est un **processus continu**, pas un état figé : nouvelles dépendances, nouvelles fonctionnalités, nouvelles CVE apparaissent en permanence.

### 1.2 Les référentiels et leur rôle

| Référentiel | Nature | Rôle concret pour le développeur |
|---|---|---|
| **OWASP Top 10** | Liste des 10 catégories de risques web les plus critiques | Prioriser : « quels risques dois-je traiter en priorité ? » |
| **OWASP ASVS** | Standard de **vérification** (centaines d'exigences testables, 3 niveaux) | Vérifier : « comment prouver que mon appli est sûre ? » Sert de check-list de recette. |
| **OWASP Secure Coding Practices** | Guide de référence rapide de règles de codage | Coder : règles concrètes ligne par ligne (validation, encodage, erreurs…). |
| **NIST SSDF (SP 800-218)** | Cadre d'intégration de la sécurité dans tout le **SDLC** | Organiser : processus, rôles, automatisation, gouvernance. |

**En une phrase :** le **Top 10** dit *quoi craindre*, **Secure Coding** dit *comment coder*, l'**ASVS** dit *comment vérifier*, le **SSDF** dit *comment industrialiser*.

### 1.3 Vision consolidée du Top 10 (2021 + tendances 2025)

| Catégorie | Ce que c'est | Où ça se joue dans ton stack |
|---|---|---|
| **Broken Access Control** | Un utilisateur accède à des données/actions non autorisées | RLS Supabase, vérifs serveur, IDOR sur `/api/...` |
| **Cryptographic Failures** | Données sensibles mal (ou non) chiffrées | TLS, chiffrement PII/santé au repos, hashing mots de passe |
| **Injection** | Données non fiables interprétées comme du code/requête | SQL/NoSQL, XSS, commandes OS |
| **Insecure Design** | Faille dans la conception même, pas dans le code | Absence de rate limiting, workflow métier abusable |
| **Security Misconfiguration** | Config par défaut, verbeuse ou permissive | Headers HTTP, CORS, buckets storage publics, env vars exposées |
| **Vulnerable & Outdated Components / Software Supply Chain Failures** | Dépendances vulnérables ou compromises | `npm`, actions CI, images Docker |
| **Identification & Authentication Failures** | Auth faible, sessions mal gérées | Login, MFA, reset password, JWT |
| **Software & Data Integrity Failures** | Code/données non vérifiés en intégrité | Build non signé, CI/CD compromis, désérialisation |
| **Security Logging & Alerting Failures** | On ne voit pas / on n'alerte pas sur les attaques | Absence de logs d'audit, pas d'alerte sur brute-force |
| **Server-Side Request Forgery (SSRF)** | Le serveur est forcé de requêter une cible interne | Fetch d'URL fournie par l'utilisateur (webhooks, imports) |
| **Mishandling of Exceptional Conditions** *(tendance 2025)* | Mauvaise gestion des erreurs/cas limites (fail-open, fuite d'info) | Try/catch trop larges, erreurs verbeuses, états incohérents |

---

## 2. Sécurité du code et de la logique métier (Secure Coding)

### 2.1 Validation et nettoyage des entrées

**Donnée non fiable (untrusted input) :** toute donnée qui ne provient pas de ton code de confiance. Cela inclut : formulaires, query params, headers, cookies, corps de requête API, fichiers uploadés, réponses d'API tierces, messages de webhooks, données lues en base qui ont pu être insérées par un utilisateur. **Règle d'or : ne jamais faire confiance à l'entrée, quelle que soit sa source.**

**Principes :**
- **Valider côté serveur, toujours.** La validation côté client (front) est une aide UX, jamais une barrière de sécurité — elle est contournable trivialement.
- **Liste blanche > liste noire.** On définit ce qui est *autorisé* (format, type, plage, énumération), pas ce qui est interdit.
- **Valider le type, la longueur, le format, la plage et l'appartenance à un ensemble.**
- **Rejeter par défaut** (fail-closed) : si la donnée ne matche pas le schéma attendu, on refuse.
- **Canonicaliser avant de valider** (normaliser l'encodage) pour éviter les contournements (double encodage, unicode).

🔴 **Mauvaise pratique**
```js
// On fait confiance au body, on l'utilise directement
app.post('/api/profil', (req, res) => {
  const age = req.body.age;            // peut être "abc", -5, 99999, un objet…
  db.update({ age });                  // insertion de données arbitraires
});
```

🟢 **Bonne pratique — validation par schéma (DTO)**
```js
// Schéma déclaratif : liste blanche stricte de ce qui est permis
const schema = z.object({
  age: z.number().int().min(13).max(120),
  pseudo: z.string().trim().min(2).max(30).regex(/^[\p{L}\p{N}_ -]+$/u),
  role: z.enum(['parent', 'enfant', 'coach']),   // ensemble fermé
});

app.post('/api/profil', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Entrée invalide' });
  db.update(parsed.data);              // seuls les champs validés passent
});
```

**Uploads de fichiers** (photos de profil, justificatifs) :
- Valider le **type MIME réel** (magic bytes), pas seulement l'extension ni le `Content-Type` déclaré.
- Imposer une **taille maximale** et un **nombre max** de fichiers.
- **Renommer** le fichier (UUID) côté serveur, ne jamais réutiliser le nom fourni.
- Stocker **hors de la racine web** / dans un bucket dédié, servir via URL signée à durée limitée.
- Ne jamais exécuter/interpréter un fichier uploadé.

### 2.2 Prévention des injections (SQL, NoSQL, OS, LDAP…)

La cause racine de toute injection : **mélanger du code et des données**. La solution universelle : **les séparer** via des mécanismes paramétrés.

🔴 **Mauvaise pratique — concaténation de chaînes**
```js
// L'entrée utilisateur devient une partie de la requête → injection SQL
const q = "SELECT * FROM users WHERE email = '" + email + "'";
db.query(q);   // email = "' OR '1'='1" → fuite de toute la table
```

🟢 **Bonne pratique — requête paramétrée / prepared statement**
```js
// Les données restent des données, jamais interprétées comme du SQL
db.query('SELECT * FROM users WHERE email = $1', [email]);
```

**Règles :**
- **Toujours** des requêtes paramétrées / prepared statements / un ORM sûr. Jamais de concaténation.
- **NoSQL** : refuser les opérateurs injectés (`{ $gt: '' }`) → valider que les valeurs sont des scalaires attendus, pas des objets.
- **Commandes OS** : éviter d'appeler le shell ; si indispensable, utiliser des API qui passent les arguments en tableau (`execFile(cmd, [args])`) sans passer par `sh -c`, et valider chaque argument par liste blanche.
- **LDAP / XPath / templates** : utiliser les échappements/paramétrages propres à chaque interpréteur.
- **Moindre privilège BD :** le compte applicatif ne doit avoir que les droits nécessaires (pas de `DROP`, pas de `SUPERUSER`). Sur Supabase, ce principe se matérialise par la **Row-Level Security (RLS)** : chaque table sensible a des policies qui filtrent par `auth.uid()`, et le rôle `anon` n'a accès qu'au strict minimum.

> **Spécifique Supabase :** l'API auto-générée (PostgREST) expose tes tables. La RLS est ta **dernière ligne de défense** — active-la sur **toutes** les tables contenant des données utilisateur, teste les policies, et ne t'appuie jamais uniquement sur du filtrage côté client.

### 2.3 Protection contre les XSS

Le XSS = injection de HTML/JS dans une page, exécuté dans le navigateur d'une victime. Trois formes : **stocké** (le plus grave), **réfléchi**, **DOM-based**.

**Défense principale : l'encodage de sortie contextuel.** On encode la donnée selon l'endroit où elle est insérée (corps HTML, attribut, URL, JS).

🔴 **Mauvaise pratique**
```jsx
// Injection directe de contenu utilisateur dans le DOM
element.innerHTML = commentaireUtilisateur;
// React :
<div dangerouslySetInnerHTML={{ __html: bioUtilisateur }} />
```

🟢 **Bonne pratique**
```jsx
// Le framework encode automatiquement le texte
element.textContent = commentaireUtilisateur;
// React échappe par défaut :
<div>{bioUtilisateur}</div>
```

**Si tu dois vraiment rendre du HTML riche** (éditeur WYSIWYG) : passe la valeur dans une bibliothèque de **sanitisation** reconnue (ex. DOMPurify) avec une liste blanche de balises/attributs, puis rends le résultat. Ne fais jamais confiance au HTML brut.

**Content Security Policy (CSP) :** défense en profondeur qui limite les sources de scripts.
```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
  base-uri 'self'; frame-ancestors 'none';
```
- Évite `unsafe-inline` / `unsafe-eval` pour les scripts (utilise des nonces/hashes).
- `frame-ancestors 'none'` protège du clickjacking (remplace l'ancien `X-Frame-Options`).

**Anti-patterns à bannir :** `innerHTML`, `outerHTML`, `document.write`, `eval`, `dangerouslySetInnerHTML` sur données non sanitisées, injection d'URL non validée dans `href`/`src` (attention aux `javascript:`).

### 2.4 Gestion des erreurs et des logs

C'est le cœur de la catégorie **Mishandling of Exceptional Conditions**. Une mauvaise gestion d'erreur peut soit **fuiter de l'information** (stack trace, requête SQL, chemin serveur), soit **laisser le système dans un état incohérent** (fail-open : on continue alors qu'on aurait dû refuser).

**Principes :**
- **Message générique côté utilisateur, détail côté logs.**
  🔴 `res.status(500).send(err.stack)` → 🟢 `res.status(500).json({ error: 'Erreur interne', ref: correlationId })` et on logue la stack en interne avec `correlationId`.
- **Fail closed :** en cas de doute (erreur d'un contrôle d'accès, timeout d'un service d'auth), **refuser** l'action, ne jamais l'autoriser par défaut.
- **Ne jamais avaler silencieusement une exception** de sécurité (`catch {}` vide) : on logue et on décide explicitement.
- **Ne pas logger de données sensibles** : mots de passe, tokens, secrets, numéros de carte, PII/données de santé en clair. Masquer/tronquer (`****1234`).
- **Logs de sécurité structurés** (JSON) avec : horodatage UTC, identifiant de corrélation, acteur (user id, IP), action, résultat (succès/échec), ressource. Pas de contenu sensible.

---

## 3. Authentification, sessions et contrôle d'accès

### 3.1 Gestion des mots de passe et secrets

**Politique de mots de passe (aligné NIST 800-63B) :**
- **Longueur minimale 8-12** caractères, **maximum élevé** (≥ 64) pour autoriser les phrases de passe.
- **Ne pas imposer de règles de complexité arbitraires** (1 majuscule + 1 chiffre + 1 symbole) : elles poussent aux mots de passe faibles prévisibles. Privilégier la longueur.
- **Bloquer les mots de passe compromis** (comparaison à une liste de mots de passe connus comme fuités).
- **Pas d'expiration périodique forcée** sans raison (contre-productif) ; forcer le changement uniquement en cas de suspicion de compromission.

**Stockage des mots de passe :**
- **Jamais en clair, jamais avec un hash rapide** (MD5, SHA-1, SHA-256 seul).
- Utiliser une fonction de **dérivation lente et salée** : **Argon2id** (recommandé), **bcrypt** ou **scrypt**/PBKDF2 avec paramètres adéquats.
- Le **sel unique par utilisateur** est intégré par ces algorithmes ; ajouter éventuellement un **poivre** (pepper) stocké séparément.

> **Spécifique Supabase :** l'auth (hashing, sel, reset) est gérée par GoTrue — tu n'implémentes pas le hashing toi-même, c'est un bon point. Ta responsabilité : politiques de mot de passe, activation MFA, sécurisation des flux de reset, et protection des JWT.

**Gestion des secrets (API keys, tokens, service_role) :**
- 🔴 **Jamais** de secret en dur dans le code, ni committé dans Git (`.env` doit être dans `.gitignore`).
- 🟢 Secrets dans un **coffre** / variables d'environnement du provider (Vercel env vars, Supabase secrets), avec **portée** (dev/preview/prod séparés).
- La clé **`service_role` Supabase** contourne la RLS : elle ne doit **jamais** être exposée côté client (jamais dans `NEXT_PUBLIC_*`), uniquement côté serveur (route handlers, edge functions).
- **Rotation** régulière et **révocation** immédiate en cas de fuite.
- Détecter les secrets committés avec un scanner (git-secrets, gitleaks, TruffleHog) en pre-commit + CI.

### 3.2 Multi-Factor Authentication (MFA)

Le MFA neutralise l'immense majorité des attaques par vol de mot de passe (phishing, credential stuffing).

- **Obligatoire pour les comptes à privilèges** (admin, super-admin, coach avec accès à des données de mineurs).
- **Fortement recommandé pour tous**, au minimum **proposé**.
- **Exiger une ré-authentification / MFA (step-up) pour les actions sensibles** : changement d'email, de mot de passe, suppression de compte, export de données, changement de rôle.
- Privilégier **TOTP (app d'authentification)** ou **WebAuthn/passkeys** (résistants au phishing) plutôt que le SMS (vulnérable au SIM-swapping) quand c'est possible.

### 3.3 Gestion des sessions

- **Cookies de session sécurisés :**
  ```
  Set-Cookie: session=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/
  ```
  - `HttpOnly` → inaccessible au JS (protège du vol par XSS).
  - `Secure` → transmis uniquement en HTTPS.
  - `SameSite=Lax` (ou `Strict`) → mitige le CSRF.
- **Identifiants de session imprévisibles** (aléa cryptographique), stockés opaques côté serveur.
- **Régénérer l'ID de session après authentification** (protection contre la fixation de session).
- **Expiration :** inactivité (ex. 30 min) **et** durée absolue (ex. 8-24 h).
- **Invalidation :** au logout (côté serveur, pas juste supprimer le cookie), au changement de mot de passe (révoquer toutes les sessions), sur détection d'anomalie.
- **JWT :** si tu utilises des tokens (Supabase), durée de vie **courte** pour l'access token + **refresh token** rotatif ; prévoir une **liste de révocation** ou une invalidation côté serveur car un JWT est valide jusqu'à expiration par nature.
- **Protection CSRF** pour les endpoints à état modifiés via cookies : `SameSite` + token anti-CSRF (double-submit ou synchronizer token) sur les mutations.

### 3.4 Contrôle d'accès (RBAC / ABAC)

C'est le **risque n°1** du Top 10 (Broken Access Control). La règle absolue : **tout contrôle d'accès se fait côté serveur, à chaque requête.**

**Principes :**
- **Deny by default :** aucun accès sans autorisation explicite.
- **Moindre privilège :** chaque rôle a le minimum de droits nécessaires.
- **Vérifier à chaque requête**, sur **chaque ressource** — jamais se fier à l'UI (un bouton caché n'est pas un contrôle).
- **RBAC** (par rôle : parent, enfant, coach, admin) souvent complété par **ABAC** (par attribut : « ce coach peut voir ce dossier *parce qu'il supervise cet enfant* »).

**IDOR (Insecure Direct Object Reference) — l'erreur la plus courante :**

🔴 **Mauvaise pratique**
```js
// On récupère la ressource par son id sans vérifier le propriétaire
app.get('/api/dossiers/:id', (req, res) => {
  const dossier = db.getDossier(req.params.id);   // n'importe qui accède à n'importe quel id
  res.json(dossier);
});
```

🟢 **Bonne pratique**
```js
app.get('/api/dossiers/:id', requireAuth, (req, res) => {
  const dossier = db.getDossier(req.params.id);
  if (!dossier) return res.status(404).end();
  // Vérification d'appartenance / de droit
  if (!canAccess(req.user, dossier)) return res.status(403).end();
  res.json(dossier);
});
```

**Escalade de privilèges :**
- **Horizontale** (accéder aux données d'un autre utilisateur du même rôle) → vérifier l'**ownership** systématiquement.
- **Verticale** (un utilisateur devient admin) → **ne jamais** laisser le client fixer son propre rôle ; le rôle est une donnée de confiance stockée serveur, non modifiable par l'utilisateur.

> **Spécifique à ton projet :** ta mémoire indique que l'autorité du rôle = `app_metadata.role` (non auto-modifiable) et que `profiles.role` est verrouillé — c'est exactement la bonne architecture. Continue de **vérifier le rôle côté serveur/RLS** et jamais uniquement côté React. La RLS Supabase doit refléter les règles ABAC (supervision coach→enfant).

---

## 4. Cryptographie et protection des données

### 4.1 Données en transit

- **HTTPS/TLS partout**, sans exception (y compris entre services internes).
- **TLS 1.2 minimum, TLS 1.3 recommandé.** Désactiver SSLv3, TLS 1.0/1.1 et les suites obsolètes (RC4, 3DES, export).
- **HSTS** pour forcer HTTPS et empêcher le downgrade :
  ```
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  ```
- **Rediriger** tout HTTP vers HTTPS. Vercel/Supabase fournissent TLS par défaut — vérifie que HSTS et la redirection sont bien actifs.
- Ne pas mettre de données sensibles dans les **URL** (query string) — elles sont loguées, mises en cache, dans l'historique.

### 4.2 Données au repos

- **Chiffrer les données sensibles** : PII, **données de santé** (une plateforme de coaching/bien-être en manipule potentiellement — attention à la qualification « données sensibles » RGPD/Loi 25), données financières.
- **Chiffrement au niveau base/disque** (fourni par Supabase/Postgres) **+**, pour les champs les plus sensibles, **chiffrement applicatif au niveau colonne** (l'appli chiffre avant d'écrire).
- **Gestion des clés (KMS) :**
  - Clés **stockées séparément** des données chiffrées (jamais dans la même base).
  - **Rotation** périodique des clés.
  - **Séparation des rôles** : qui peut lire les données ≠ qui gère les clés.
- **Minimisation :** ne stocke que ce dont tu as besoin. La donnée que tu ne stockes pas ne peut pas fuir. Anonymise/pseudonymise quand c'est possible, surtout pour des **mineurs**.
- **Effacement :** prévois la suppression réelle (droit à l'effacement RGPD/Loi 25) et l'expiration des données.

### 4.3 Hashing et intégrité

- **Hashing mot de passe :** Argon2id/bcrypt (cf. 3.1) — lent et salé.
- **Hashing d'intégrité / empreinte :** SHA-256/SHA-3 (rapide) pour vérifier qu'un fichier n'a pas été altéré.
- **HMAC** (avec clé secrète) pour vérifier l'authenticité de webhooks entrants (ex. valider la signature d'un webhook Stripe/Supabase avant de le traiter).
- **Signatures numériques** pour garantir l'intégrité et l'origine d'artefacts (releases, packages).
- **Aléa cryptographique** : utiliser un CSPRNG (`crypto.randomBytes`) pour tokens, ID de session, codes — jamais `Math.random()`.
- **Ne jamais inventer sa crypto** : utiliser des bibliothèques éprouvées et à jour.

---

## 5. Sécurité des APIs et microservices

### 5.1 Authentification et autorisation des APIs

- **Authentifier chaque endpoint** (sauf endpoints réellement publics, explicitement marqués).
- **OAuth2 / OIDC** pour l'auth déléguée ; **JWT** pour les tokens (courte durée, signés, vérifiés à chaque appel — vérifier `signature`, `exp`, `iss`, `aud`).
- **API keys** pour les intégrations machine-à-machine : uniques par client, à portée limitée, révocables, jamais dans le code front.
- **Scopes / permissions granulaires :** un token ne doit porter que les droits strictement nécessaires (moindre privilège au niveau du token).
- **Vérifier l'autorisation au niveau objet** (BOLA/IDOR est le risque n°1 des API — cf. 3.4), pas seulement au niveau route.

### 5.2 Validation des payloads et contrats d'API

- **Contrat d'API explicite** : OpenAPI/GraphQL schema. Le contrat = liste blanche de ce qui est accepté.
- **Valider le payload entrant** contre un schéma (JSON Schema / DTO) : types, champs requis, formats, bornes. **Rejeter les champs inconnus** (`additionalProperties: false`) pour éviter le **mass assignment** (l'utilisateur injecte `isAdmin: true`).
- **Contrôler la sortie** : ne renvoyer que les champs nécessaires (éviter la **fuite de données excessive** — ne jamais renvoyer un objet user complet avec hash, tokens, champs internes). Utiliser des DTO/serializers explicites.
- **GraphQL** : limiter la **profondeur** et la **complexité** des requêtes, désactiver l'introspection en prod si non nécessaire, paginer.
- **Versionner** l'API pour gérer les changements sans casser la sécurité.

### 5.3 Protections spécifiques (SSRF, rate limiting, anti-abus)

**SSRF** (le serveur est manipulé pour requêter une cible interne) — critique dès que ton serveur **fetch une URL fournie par l'utilisateur** (import d'image par URL, webhook sortant, avatar distant) :
- **Liste blanche** des domaines/hôtes autorisés.
- **Bloquer les IP privées/internes** (`127.0.0.1`, `169.254.169.254` métadonnées cloud, `10.0.0.0/8`, `192.168.0.0/16`, `::1`).
- **Résoudre le DNS puis valider l'IP** avant de requêter (contre le DNS rebinding), désactiver les redirections automatiques.
- Isoler le service qui fait des requêtes sortantes.

**Rate limiting & anti-abus :**
- **Limiter le débit** par IP / par compte / par clé API sur les endpoints sensibles (login, reset password, API coûteuses).
- **Backoff progressif** et **CAPTCHA** après N échecs d'authentification (anti brute-force / credential stuffing).
- **Quotas** par plan (SaaS) et protection contre le déni de service applicatif (payloads volumineux → limiter la taille du body, timeouts).
- **Détection d'anomalies** : pics de trafic, énumération d'IDs, géolocalisations improbables.

**En-têtes de sécurité HTTP à poser sur toutes les réponses :**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Cache-Control: no-store            # sur les réponses contenant des données sensibles
```

**CORS :** ne jamais utiliser `Access-Control-Allow-Origin: *` avec des credentials. Lister explicitement les origines de confiance.

---

## 6. Sécurité de configuration et infrastructure

### 6.1 Durcissement des environnements

- **Supprimer/désactiver** : comptes par défaut, endpoints de debug, pages d'admin par défaut, fichiers de test, données d'exemple, sample apps, ports/services inutiles.
- **Désactiver les messages d'erreur verbeux** en production (pas de stack trace, pas de version de framework exposée dans les headers `X-Powered-By`).
- **Séparer strictement les environnements** dev / staging / prod (bases, secrets, clés distinctes). Ne jamais pointer une preview Vercel vers la base de prod avec des droits d'écriture.
- **Buckets/Storage :** vérifier qu'aucun bucket n'est **public par erreur**. Servir les fichiers privés via **URL signées** à durée limitée.
- **Mises à jour et patchs** : maintenir OS, runtime, framework, dépendances à jour. Appliquer les patchs de sécurité rapidement.
- **Config as code + revue :** la configuration d'infra (Terraform, config Vercel/Supabase) doit être versionnée et revue.

### 6.2 WAF et protections périmétriques

- Un **WAF** (Web Application Firewall) filtre le trafic malveillant connu (injections, scanners) avant qu'il n'atteigne l'appli. Vercel/Cloudflare en proposent.
- Le WAF est une **défense en profondeur**, **jamais un substitut** au code sécurisé (il se contourne).
- Ajouter des **règles personnalisées** (bloquer des patterns d'abus spécifiques, geo-blocking si pertinent) et une protection **anti-DDoS** au niveau CDN.

### 6.3 Gestion des dépendances et supply chain

C'est une catégorie **montante et critique** (Software Supply Chain Failures).

- **Inventaire des composants (SBOM)** : savoir précisément ce que tu embarques (dépendances directes **et** transitives).
- **Scan continu des vulnérabilités** : `npm audit`, Dependabot/Renovate, Snyk, `osv-scanner` — en CI, bloquant sur les CVE critiques.
- **Verrouiller les versions** (`package-lock.json` committé) et vérifier l'**intégrité** (hashes/lockfile).
- **Se méfier des dépendances** : packages abandonnés, typosquatting, mainteneurs douteux, scripts `postinstall` suspects. Minimiser le nombre de dépendances.
- **Épingler les GitHub Actions** par **commit SHA** (pas juste par tag mutable) et limiter leurs permissions (`GITHUB_TOKEN` en lecture seule par défaut).
- **Images de conteneurs** : partir d'images minimales officielles, les scanner, ne pas tourner en root.
- **Vérifier l'intégrité des artefacts** : signatures (Sigstore/cosign), provenance (SLSA) pour les livrables.

---

## 7. Sécurité mobile (si application mobile)

> Ta cible principale est une **PWA / web mobile-first** (~80 % mobile). Une PWA hérite des protections web (sections 2-6). Les points ci-dessous s'appliquent surtout si tu passes à du **natif** (React Native/Expo, iOS/Android). Certains restent valables pour la PWA (stockage local, TLS).

### 7.1 Stockage sécurisé sur mobile

- **À NE JAMAIS stocker en clair** : mots de passe, tokens d'auth long-vécus, clés API, données de santé/PII sensibles.
- Utiliser le **stockage sécurisé du système** :
  - iOS → **Keychain**.
  - Android → **EncryptedSharedPreferences** / **Keystore**.
  - React Native → **expo-secure-store** / Keychain.
- **PWA :** `localStorage` n'est **pas** sécurisé (accessible au JS, persistant, vulnérable au XSS). Préférer des cookies `HttpOnly Secure SameSite` pour les tokens de session ; ne pas y stocker de secrets.
- **Ne pas mettre de secrets en cache** dans des logs, screenshots, ou le presse-papier.

### 7.2 Obfuscation et rétro-ingénierie

- **Aucun secret côté client** : tout ce qui est livré sur l'appareil est lisible. Les clés d'API sensibles restent **côté serveur**.
- **Obfusquer** le code natif (ProGuard/R8 sur Android, minification) — c'est un ralentisseur, pas une protection absolue.
- **Ne jamais** embarquer de logique d'autorisation critique uniquement côté client.

### 7.3 Appareils rootés / jailbreakés

- **Détecter** root/jailbreak et adapter le comportement (avertir, restreindre les actions très sensibles) selon le niveau de risque — sans bloquer aveuglément si ce n'est pas justifié.
- **Attestation d'intégrité** de l'appareil/app (Play Integrity, App Attest) pour les opérations critiques.

### 7.4 Communications mobiles

- **TLS obligatoire** ; interdire le trafic en clair (`cleartextTrafficPermitted=false` sur Android).
- **Certificate/SSL pinning** pour les apps natives sensibles (limite les attaques MITM), avec un plan de rotation des certificats pour ne pas casser l'app.
- **BLE / NFC** (si utilisés, ex. capteurs sportifs) : chiffrer les échanges applicatifs, authentifier l'appairage, ne pas faire confiance aux données reçues (les valider comme toute entrée).

---

## 8. Processus de développement sécurisé (DevSecOps, SDLC) — NIST SSDF

Le SSDF organise les pratiques en 4 groupes : **PO** (préparer l'organisation), **PS** (protéger le logiciel), **PW** (produire du logiciel bien sécurisé), **RV** (répondre aux vulnérabilités).

### 8.1 Intégrer la sécurité dans le SDLC

- **Conception — Threat modeling :** avant de coder une fonctionnalité sensible, se poser « qu'est-ce qui peut mal tourner ? ». Méthode simple **STRIDE** (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege). Identifier les surfaces d'attaque, les données sensibles, les frontières de confiance.
- **Exigences de sécurité** explicites dans les specs (« cet endpoint exige rôle X et MFA »).
- **Revues de code orientées sécurité :** au minimum une relecture par un pair sur les zones sensibles (auth, contrôle d'accès, crypto, gestion des entrées). Checklist de revue dédiée.
- **Standards de codage sécurisé** partagés dans l'équipe (ce document en est la base).

### 8.2 Tests de sécurité automatisés (pipeline CI/CD)

| Type | Ce que ça teste | Quand |
|---|---|---|
| **SAST** (analyse statique) | Vulnérabilités dans le code source (injection, secrets, patterns dangereux) | À chaque PR |
| **SCA** (analyse des dépendances) | CVE dans les libs, licences | À chaque PR + veille continue |
| **Secret scanning** | Secrets committés | Pre-commit + CI |
| **DAST** (analyse dynamique) | Vulnérabilités sur l'appli qui tourne (headers, XSS, config) | Sur staging, périodique |
| **IaC scanning** | Mauvaises configs d'infra (Terraform, Docker) | À chaque PR |
| **Lint sécurité** | Règles (`eslint-plugin-security`) | À chaque PR |

- **Intégrer dans le pipeline** (GitHub Actions) : ces contrôles s'exécutent automatiquement, **bloquants** sur les findings critiques.
- **Fail the build** sur CVE critique / secret détecté, plutôt que d'alerter mollement.
- **Gérer les faux positifs** proprement (suppression documentée), pour ne pas désensibiliser l'équipe.

### 8.3 Tests d'intrusion (pentests)

- Les tests automatisés ne remplacent pas l'analyse humaine. **Un pentest manuel** périodique (ou avant un lancement majeur) trouve les failles de **logique métier** que les scanners ratent (escalade de privilèges, contournement de workflow).
- Compléter par un **programme de divulgation responsable** (bug bounty ou simple `security.txt` + contact) pour recevoir les signalements externes.
- Re-tester après correction (regression security testing).

### 8.4 Monitoring, journalisation et réponse aux incidents

**Logs de sécurité à collecter** (catégorie Logging & Alerting Failures) :
- Authentification : succès, **échecs**, verrouillages, MFA.
- Contrôle d'accès : refus d'accès (403), tentatives sur ressources d'autrui.
- Changements sensibles : modification de rôle, de mot de passe, d'email, export/suppression de données.
- Erreurs applicatives et exceptions serveur.
- Événements admin et accès aux données sensibles (audit trail — important pour données de mineurs / RGPD-Loi 25).

**Qualité des logs :**
- Centralisés, horodatés (UTC), immuables/append-only, avec identifiant de corrélation.
- **Sans données sensibles en clair** (cf. 2.4).
- Rétention définie et conforme à la réglementation.

**Alerting & détection d'anomalies :** alerter en temps quasi réel sur : pics d'échecs de login, énumération d'IDs, accès inhabituels (heure/géo), élévations de privilèges, erreurs 5xx en masse.

**Réponse à incident (cycle) :**
1. **Préparation** — plan écrit, rôles définis, contacts, runbooks.
2. **Détection & analyse** — identifier et qualifier l'incident (gravité, périmètre).
3. **Confinement** — isoler (révoquer sessions/clés, couper l'accès compromis).
4. **Éradication & correction** — supprimer la cause, patcher.
5. **Récupération** — restaurer proprement, surveiller la récidive.
6. **Post-mortem** — leçons apprises, correctifs de fond, mise à jour du threat model.
7. **Obligations légales** — notification des violations de données (RGPD : 72 h à l'autorité ; Loi 25 au Québec : déclaration à la CAI et aux personnes concernées en cas de risque de préjudice sérieux). Prépare ce process **à l'avance**.

**Sauvegardes :** chiffrées, testées (restauration réellement vérifiée), isolées (protection contre ransomware), avec un RPO/RTO définis.

---

## 9. Synthèse — Check-list opérationnelle

### 9.1 Niveaux ASVS (pour te situer)

- **Niveau 1** — contrôles de base, testables en boîte noire. Minimum pour toute appli exposée.
- **Niveau 2** — recommandé pour la **majorité des applis** manipulant des **données personnelles/sensibles** → **c'est ta cible** (données de mineurs, santé/bien-être).
- **Niveau 3** — applications critiques (santé lourde, finance, défense). Vérification approfondie.

### 9.2 Tableau récapitulatif par catégorie

| Catégorie | Principaux risques | Contrôles clés | Actions concrètes développeur |
|---|---|---|---|
| **Code** | Injection, XSS, mauvaise gestion d'erreurs | Validation entrée, encodage sortie, requêtes paramétrées, fail-closed | Valider tout body par schéma (Zod/DTO) ; **toujours** des prepared statements ; jamais `dangerouslySetInnerHTML`/`innerHTML` sur données non sanitisées ; messages d'erreur génériques + logs internes |
| **Auth & Accès** | Broken Access Control (IDOR), escalade de privilèges, sessions faibles | Deny-by-default, vérif serveur systématique, MFA, sessions durcies | Vérifier ownership sur **chaque** ressource ; rôle non modifiable par le client (`app_metadata`) ; cookies `HttpOnly Secure SameSite` ; MFA pour admin + actions sensibles ; régénérer la session après login |
| **Crypto & Données** | Fuite PII/santé, données en clair, hash faibles | TLS partout, chiffrement au repos, KMS, hashing lent | HTTPS + HSTS ; Argon2id/bcrypt pour mots de passe ; chiffrer les colonnes sensibles ; minimiser/pseudonymiser ; clés hors de la base + rotation |
| **APIs** | BOLA/IDOR, mass assignment, fuite de données, SSRF | AuthZ au niveau objet, validation payload, whitelist sortante, rate limiting | Valider entrées **et** sorties (DTO) ; `additionalProperties:false` ; rate-limit login/reset ; whitelist des URL sortantes + blocage IP internes |
| **Config & Infra** | Misconfiguration, buckets publics, headers manquants | Durcissement, séparation des envs, headers sécurité | Poser tous les security headers + CSP ; CORS explicite (pas de `*`) ; `service_role` jamais côté client ; vérifier buckets privés + URL signées ; RLS active sur toutes les tables |
| **Supply chain** | Dépendances vulnérables/compromises | SBOM, scan continu, lockfile, pinning | `npm audit` + Dependabot bloquants en CI ; lockfile committé ; épingler les Actions par SHA ; scanner les secrets (gitleaks) |
| **Mobile / PWA** | Stockage non sécurisé, secrets côté client, MITM | Stockage sécurisé, pas de secret client, TLS/pinning | Tokens en cookies `HttpOnly` (pas `localStorage`) ; secrets seulement côté serveur ; Keychain/SecureStore en natif ; SSL pinning si natif sensible |
| **DevSecOps** | Failles introduites sans détection, CI/CD compromis | Threat modeling, SAST/DAST/SCA, revues, intégrité build | Threat model des features sensibles ; SAST + SCA + secret scan bloquants en CI ; revue de code sécurité obligatoire sur auth/accès/crypto ; pentest avant lancement |
| **Monitoring & IR** | Attaques invisibles, réponse improvisée | Logs d'audit, alerting, plan d'incident | Loguer login échoués, 403, changements de rôle (sans données sensibles) ; alertes brute-force/anomalies ; plan IR écrit + process de notification RGPD/Loi 25 ; sauvegardes chiffrées testées |

### 9.3 Top 15 des réflexes non négociables

1. Valider **toutes** les entrées côté serveur, par liste blanche/schéma.
2. **Toujours** des requêtes paramétrées — zéro concaténation SQL.
3. Encoder les sorties ; jamais d'injection HTML brute non sanitisée.
4. Contrôle d'accès **côté serveur** sur chaque ressource (anti-IDOR).
5. Le rôle/les privilèges ne sont **jamais** fixés par le client.
6. Mots de passe hachés avec **Argon2id/bcrypt** ; MFA sur les comptes sensibles.
7. Cookies de session `HttpOnly; Secure; SameSite`.
8. HTTPS + **HSTS** partout ; TLS 1.2+.
9. Secrets hors du code et hors de Git ; `service_role` jamais exposée.
10. **RLS Supabase active** sur toutes les tables de données utilisateur.
11. Security headers + **CSP** stricte sur toutes les réponses.
12. Rate limiting sur login/reset/API sensibles ; anti brute-force.
13. Bloquer SSRF (whitelist + blocage IP internes) sur tout fetch d'URL utilisateur.
14. Scan des dépendances **bloquant** en CI + lockfile committé.
15. Logs d'audit + alerting + plan de réponse à incident (avec obligations RGPD/Loi 25).

---

*Document de référence AppSec — à versionner dans le repo et à réviser à chaque évolution majeure de l'architecture. Aligné OWASP Top 10, ASVS (cible niveau 2), Secure Coding Practices et NIST SSDF.*
