# Celva — Runbook de déploiement

Guide self-contained pour mettre en production les 3 apps Celva à partir de zéro.
Tout passe par **GitHub Actions** (déclenché au push), avec un modèle deux-branches.

| App | Plateforme | Prod | Preprod |
|-----|-----------|------|---------|
| Storefront (Next.js 15) | **Vercel** | `celva.store` | `preprod.celva.store` |
| Admin (Vite/React) | **Cloudflare Pages** | `admin.celva.store` | `preprod.admin.celva.store` |
| API (NestJS + Prisma) | **Railway** (Docker) | `api.celva.store` | `preprod.api.celva.store` |
| Postgres 16 | **Railway** (managé) | — | — |

**Modèle de branches** (le merge déclenche le deploy, pas de deploy manuel) :
- `develop` → **preprod**
- `main` → **production** (uniquement via PR de release depuis `develop`)

Les workflows sont *path-filtered* : un push qui ne touche que `apps/storefront/**` ne
redéploie que le storefront. Ils sont **désactivés par défaut** : il faut mettre la
variable repo `*_DEPLOY_ENABLED=true` **et** renseigner les secrets pour chacun.

---

## 0. Correctif Dockerfile API — DÉJÀ FAIT dans le repo

Pour mémoire, deux bugs ont été corrigés (commit à pousser) :
1. **CMD** : `dist/main.js` → `dist/src/main.js` (Nest compile `src/` → `dist/src/`).
2. **Migrations** : ajout de [`apps/api/docker-entrypoint.sh`](../apps/api/docker-entrypoint.sh)
   qui lance `prisma migrate deploy` avant de booter le serveur.
   Le **seed n'est volontairement PAS dans le boot** (il `update` zones/settings →
   écraserait les édits admin). Seed = étape one-shot manuelle (cf. §1.5).

### Vérifier le build Docker (optionnel mais recommandé)
Docker Desktop lancé, depuis la racine du repo :
```bash
docker build -f apps/api/Dockerfile -t celva-api:test .
# Smoke test (sans DB, doit au moins démarrer jusqu'à l'attente DATABASE_URL) :
docker run --rm -e NODE_ENV=production celva-api:test node -e "console.log('image OK')"
```

---

## 1. API → Railway  *(à faire EN PREMIER — storefront & admin pointent dessus)*

### 1.1 Créer les services
Sur [railway.app](https://railway.app), projet Celva :
- [ ] Service **`celva-api`** (prod) — déployé depuis le repo, build via `apps/api/Dockerfile`.
- [ ] Service **`celva-api-preprod`** (preprod) — idem.
- [ ] Ajouter un **Postgres** managé à chaque environnement (fournit `DATABASE_URL` auto).

> Les deux services pointent sur le **même Dockerfile**, seules les variables d'env diffèrent.

### 1.2 Variables d'env (TOUTES requises — aucun défaut dans le code)
Source de vérité : [`apps/api/.env.example`](../apps/api/.env.example). À renseigner sur **chaque** service :

```bash
# Server
NODE_ENV=production
PORT=3001
API_VERSION=v1
LOG_LEVEL=info

# Database — fourni automatiquement par le Postgres Railway
DATABASE_URL=<référence Railway au Postgres du même env>

# Auth — GÉNÉRER du random 32+ chars : openssl rand -base64 32
JWT_ACCESS_SECRET=<random 32+>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=<random 32+ différent>
JWT_REFRESH_EXPIRATION=7d
COOKIE_SECRET=<random 32+>

# Seed admin bootstrap (sert au seed one-shot)
SEED_ADMIN_EMAIL=admin@celva.store
SEED_ADMIN_PASSWORD=<mot de passe fort>   # mustChangePassword=true au 1er login

# URLs front (liens email + CORS)
# PROD :
STOREFRONT_URL=https://celva.store
ADMIN_URL=https://admin.celva.store
CORS_ORIGINS=https://celva.store,https://admin.celva.store,https://livraison.celva.store
# PREPROD : remplacer par les sous-domaines preprod.*

# Cloudflare R2 + Images (OBLIGATOIRE en prod, sinon fallback FS local dev/CI seulement)
R2_ACCOUNT_ID=<...>
R2_ACCESS_KEY_ID=<...>
R2_SECRET_ACCESS_KEY=<...>
R2_BUCKET_NAME=celva-media
R2_ENDPOINT=<endpoint S3 du bucket R2>
R2_PUBLIC_URL=https://media.celva.store
CF_IMAGES_BASE_URL=https://celva.store/cdn-cgi/image

# Email (Mailgun) — si activé
MAILGUN_API_KEY=<...>
MAILGUN_DOMAIN=celva.store
MAILGUN_FROM=Celva Store <no-reply@celva.store>
MAILGUN_REGION=us

# Observabilité — si activé
SENTRY_DSN=<...>
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 1.3 Domaines (Cloudflare DNS — domaines déjà chez Cloudflare)
- [ ] `api.celva.store` → CNAME vers le domaine Railway du service `celva-api`.
- [ ] `preprod.api.celva.store` → CNAME vers `celva-api-preprod`.
- [ ] Côté Railway : ajouter ces custom domains sur chaque service.

### 1.4 Secrets + activation côté GitHub
GitHub repo → Settings :
- [ ] Secret **`RAILWAY_TOKEN`** (token du projet, scope prod).
- [ ] Secret **`RAILWAY_TOKEN_PREPROD`**.
- [ ] Variable **`API_DEPLOY_ENABLED = true`**.

### 1.5 Seed one-shot (base fraîche uniquement)
Les migrations tournent toutes seules au boot. Le seed se fait **une seule fois**,
manuellement, via le shell Railway du service (ou en local pointé sur la DB prod) :
```bash
npm run prisma:seed     # crée l'admin, settings, zones de livraison, point retrait
```
⚠️ Ne PAS relancer le seed après que l'admin ait édité tarifs/réglages (il les réécrit).

---

## 2. Storefront → Vercel

### 2.1 Projet
- [ ] Importer le repo sur [vercel.com](https://vercel.com), **Root Directory = `apps/storefront`**.
- [ ] Le projet doit exister pour récupérer `ORG_ID` / `PROJECT_ID` (le workflow build via la CLI).

### 2.2 Variables d'env (Vercel → Settings → Environment Variables)
Source : [`apps/storefront/.env.example`](../apps/storefront/.env.example)
```bash
API_INTERNAL_URL=https://api.celva.store        # preprod : https://preprod.api.celva.store
NEXT_PUBLIC_SITE_URL=https://celva.store         # preprod : https://preprod.celva.store
NEXT_PUBLIC_CONTACT_WHATSAPP=2376XXXXXXXX        # numéro réel
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=celva.store
```

### 2.3 Domaines
- [ ] `celva.store` (+ `www` redirect) → env Production.
- [ ] `preprod.celva.store` → env Preview.
- [ ] DNS : suivre les enregistrements que Vercel indique (A/CNAME) côté Cloudflare.

### 2.4 Secrets + activation côté GitHub
- [ ] Secret **`VERCEL_TOKEN`**.
- [ ] Secret **`VERCEL_ORG_ID`**.
- [ ] Secret **`VERCEL_PROJECT_ID_STOREFRONT`**.
- [ ] Variable **`STOREFRONT_DEPLOY_ENABLED = true`**.

---

## 3. Admin → Cloudflare Pages

### 3.1 Projet
- [ ] Créer un projet Pages nommé **exactement `celva-admin`**
  (le workflow fait `pages deploy apps/admin/dist --project-name=celva-admin`).
- [ ] Build géré par GitHub Actions (pas par le CI Cloudflare) — le workflow build puis push `dist/`.

### 3.2 Domaines
- [ ] `admin.celva.store` → projet Pages (branche `main`).
- [ ] `preprod.admin.celva.store` → branche `develop`.

### 3.3 Secrets + activation côté GitHub
L'URL API est injectée au build via secret (variable `VITE_API_URL`) :
- [ ] Secret **`CLOUDFLARE_API_TOKEN`** (scope : Pages edit).
- [ ] Secret **`CLOUDFLARE_ACCOUNT_ID`**.
- [ ] Secret **`VITE_API_URL_ADMIN`** = `https://api.celva.store`.
- [ ] Secret **`VITE_API_URL_ADMIN_PREPROD`** = `https://preprod.api.celva.store`.
- [ ] Variable **`ADMIN_DEPLOY_ENABLED = true`**.

---

## 4. GitHub Environments (recommandé pour gater la prod)

Les 3 workflows référencent `environment: production` / `preprod`.
- [ ] Settings → Environments → créer `production` et `preprod`.
- [ ] Mettre les secrets **prod** dans l'environment `production` (plutôt que repo-wide).
- [ ] Optionnel : *Required reviewers* sur `production` → tout deploy prod demande une validation manuelle.

---

## 5. Premier déploiement — ordre à respecter

1. [ ] **Pousser le correctif Dockerfile** (Dockerfile + docker-entrypoint.sh) sur `develop`.
2. [ ] Une fois Railway prêt : merge/push touchant l'API vers `develop`
       → vérifier que `celva-api-preprod` **boot + migre** (point de risque #1).
3. [ ] Lancer le **seed one-shot** sur la DB preprod (§1.5).
4. [ ] Push storefront + admin vers `develop` → preprod complète.
5. [ ] **Smoke test** `preprod.celva.store` + `preprod.admin.celva.store` + `preprod.api.celva.store/health`.
6. [ ] PR de release `develop` → `main` → déclenche la **production** (refaire seed one-shot sur la DB prod).

---

## 6. Récap secrets & variables GitHub

| Type | Nom | Pour |
|------|-----|------|
| Variable | `API_DEPLOY_ENABLED` | active deploy API |
| Variable | `STOREFRONT_DEPLOY_ENABLED` | active deploy storefront |
| Variable | `ADMIN_DEPLOY_ENABLED` | active deploy admin |
| Secret | `RAILWAY_TOKEN` / `RAILWAY_TOKEN_PREPROD` | API |
| Secret | `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID_STOREFRONT` | storefront |
| Secret | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | admin |
| Secret | `VITE_API_URL_ADMIN` / `VITE_API_URL_ADMIN_PREPROD` | admin (URL API au build) |

---

## 7. Référence fichiers

- Workflows : [`.github/workflows/`](../.github/workflows/) — `ci.yml`, `deploy-api.yml`, `deploy-storefront.yml`, `deploy-admin.yml`
- Dockerfile API : [`apps/api/Dockerfile`](../apps/api/Dockerfile)
- Entrypoint API : [`apps/api/docker-entrypoint.sh`](../apps/api/docker-entrypoint.sh)
- Env templates : [`apps/api/.env.example`](../apps/api/.env.example), [`apps/storefront/.env.example`](../apps/storefront/.env.example), [`apps/admin/.env.example`](../apps/admin/.env.example)
