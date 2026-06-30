# Celva — Runbook de déploiement

Guide self-contained pour mettre en production les 3 apps Celva à partir de zéro.
Tout passe par **GitHub Actions** (déclenché au push), avec un modèle deux-branches.

| App | Plateforme | Prod | Preprod |
|-----|-----------|------|---------|
| Storefront (Next.js 15) | **Vercel** | `celva.store` | `preprod.celva.store` |
| Admin (Vite/React) | **Cloudflare Pages** | `admin.celva.store` | `preprod.admin.celva.store` |
| API (NestJS + Prisma) | **VPS partagé** (Traefik + GHCR, flow Gabee) | `api.celva.store` | `preprod.api.celva.store` |
| Postgres 16 | **VPS** (conteneur Docker, 1 par env) | — | — |

**Modèles de deploy** :
- **API** → build image → GHCR → SSH `compose up -d` (flow gabee), 2 stacks sur le VPS :
  push `develop` → **preprod** (`celva-api:develop`), push tag `v*` → **prod** (`celva-api:vX`).
- **Storefront / Admin** → *branch-driven* : `develop` → preprod, `main` → production.

Les workflows storefront/admin sont *path-filtered* et **désactivés par défaut**
(variable repo `*_DEPLOY_ENABLED=true` + secrets requis). Le deploy API n'a pas de
gate `*_DEPLOY_ENABLED` : il se déclenche au push/tag (il suffit que les secrets
`VPS_*` soient renseignés).

---

## 0. Correctifs build API — DÉJÀ FAITS dans le repo

Quatre bugs qui cassaient le build Docker ont été corrigés (build désormais **vert**,
vérifié `BUILD EXIT: 0` + image qui boote) :
1. **CMD** : `dist/main.js` → `dist/src/main.js` (Nest compile `src/` → `dist/src/`).
2. **Migrations** : ajout de [`apps/api/docker-entrypoint.sh`](../apps/api/docker-entrypoint.sh)
   qui lance `prisma migrate deploy` avant de booter le serveur.
   Le **seed n'est volontairement PAS dans le boot** (il `update` zones/settings →
   écraserait les édits admin). Seed = étape one-shot manuelle (cf. §1).
3. **`@celva/shared` non construit** : le Dockerfile lançait `nest build` sans builder
   d'abord le package partagé → 98 erreurs TS. Ajout de `npm run build --workspace
   @celva/shared` dans l'étape build.
4. **`react` / `@types/react` non déclarés** dans `apps/api` (le module PDF facture
   `@react-pdf/renderer` + JSX). Ça marchait en local par hoisting npm, mais pas en
   install isolé (Docker) → 2 erreurs TS. Ajoutés aux deps d'`apps/api`.

### Vérifier le build Docker (optionnel mais recommandé)
Docker Desktop lancé, depuis la racine du repo :
```bash
docker build -f apps/api/Dockerfile -t celva-api:test .
# Smoke test (sans DB — l'image doit booter node) :
docker run --rm -e NODE_ENV=production celva-api:test node -e "console.log('image OK')"
```

---

## 1. API → VPS partagé (Traefik + GHCR — même flow que Gabee)

L'API tourne sur le **VPS partagé** comme un projet de plus : le reverse-proxy
**Traefik** déjà en place (réseau Docker externe `web`) sert tous les projets et
émet les certificats Let's Encrypt. Cette stack ajoute l'API + son Postgres.

```
Internet 80/443 → Traefik → api (NestJS :3001) → Postgres (réseau privé « internal »)
                            label Host(${API_DOMAIN}), certresolver le
```

**Flow** (même mécanique que gabee), 2 stacks sur le même VPS via
[`deploy-api.yml`](../.github/workflows/deploy-api.yml) → build → push GHCR
(`ghcr.io/iamvaln/celva-api`) → SSH → `compose pull` + `up -d`. Le service `migrate`
applique `prisma migrate deploy` avant que l'API ne (re)démarre.

```bash
git push origin develop          # → preprod (projet celva-preprod, celva-api:develop)
git tag v1.0.0 && git push …     # → prod    (projet celva, celva-api:v1.0.0)
```

Procédure complète (setup VPS, env files, DNS, seed, backup) dans
**[`deploy/DEPLOY.md`](../deploy/DEPLOY.md)**. Résumé :

### 1.1 Setup VPS (one-time)
```bash
git clone https://github.com/iamvaln/celva.git ~/celva && cd ~/celva
cp deploy/.env.production.example deploy/.env.production   # prod
cp deploy/.env.preprod.example    deploy/.env.preprod      # preprod
```
Le proxy Traefik et le réseau `web` **existent déjà** sur le VPS (gérés depuis le repo
gabee, `deploy/proxy/`) — on ne les recrée pas, on s'y branche via les labels.

### 1.2 Variables d'env
Source : **[`.env.production.example`](../deploy/.env.production.example)** +
**[`.env.preprod.example`](../deploy/.env.preprod.example)** (secrets distincts par env).
`DATABASE_URL` pointe sur le service `db` (même mot de passe que `POSTGRES_PASSWORD`).
`TRAEFIK_ROUTER` et `API_DOMAIN` diffèrent entre les deux. Fichiers réels **git-ignorés**.

### 1.3 Domaines (Cloudflare DNS)
- [ ] `api.celva.store` + `preprod.api.celva.store` → **A** vers l'IP du VPS.
      Traefik gère le TLS (TLS-ALPN) ; proxy Cloudflare ON ou OFF au choix.

### 1.4 Secrets GitHub (auto-deploy)
GitHub repo → Settings → Secrets :
- [ ] **`VPS_HOST`**, **`VPS_USER`**, **`VPS_SSH_KEY`** (clé privée), `VPS_PORT`/`VPS_APP_DIR` optionnels.
- `GITHUB_TOKEN` (login GHCR) est fourni automatiquement par Actions.

### 1.5 Seed one-shot (base fraîche uniquement)
Les migrations tournent via le service `migrate`. Le seed se fait **une seule fois** par DB
(préciser le projet `-p`) :
```bash
docker compose -p celva-preprod -f deploy/docker-compose.yml --env-file deploy/.env.preprod \
  run --rm migrate npm run prisma:seed
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

1. [ ] **Pousser les correctifs build** (Dockerfile + entrypoint + deps api + `deploy/`) sur `develop`.
2. [ ] Setup VPS (§1.1) : `git clone ~/celva`, `deploy/.env.production` rempli, DNS `api.celva.store` posé.
3. [ ] Renseigner les secrets `VPS_*` côté GitHub.
4. [ ] Premier démarrage : `docker compose -f deploy/docker-compose.yml --env-file deploy/.env.production up -d --build`.
5. [ ] **Seed one-shot** sur la DB (§1.5), puis `curl https://api.celva.store/health`.
6. [ ] Storefront + admin : push `develop`/`main` → Vercel / Cloudflare Pages.
7. [ ] Releases API suivantes : `git tag vX.Y.Z && git push origin vX.Y.Z` → build GHCR + deploy auto.

---

## 6. Récap secrets & variables GitHub

| Type | Nom | Pour |
|------|-----|------|
| Variable | `STOREFRONT_DEPLOY_ENABLED` | active deploy storefront |
| Variable | `ADMIN_DEPLOY_ENABLED` | active deploy admin |
| Secret | `VPS_HOST` / `VPS_USER` / `VPS_SSH_KEY` (+ `VPS_PORT` / `VPS_APP_DIR` opt.) | API (deploy SSH ; `GITHUB_TOKEN` auto pour GHCR) |
| Secret | `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID_STOREFRONT` | storefront |
| Secret | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | admin |
| Secret | `VITE_API_URL_ADMIN` / `VITE_API_URL_ADMIN_PREPROD` | admin (URL API au build) |

---

## 7. Référence fichiers

- Workflows : [`.github/workflows/`](../.github/workflows/) — `ci.yml`, `deploy-api.yml`, `deploy-storefront.yml`, `deploy-admin.yml`
- **VPS API stack** : [`deploy/`](../deploy/) — `docker-compose.yml` (Traefik + GHCR), `DEPLOY.md`, `.env.production.example`, `.env.preprod.example`
- Dockerfile API : [`apps/api/Dockerfile`](../apps/api/Dockerfile)
- Entrypoint API : [`apps/api/docker-entrypoint.sh`](../apps/api/docker-entrypoint.sh)
- Env templates : [`apps/api/.env.example`](../apps/api/.env.example), [`apps/storefront/.env.example`](../apps/storefront/.env.example), [`apps/admin/.env.example`](../apps/admin/.env.example)
