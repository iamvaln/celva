# Déploiement de l'API Celva (VPS partagé, même flow que Gabee)

L'API Celva tourne sur le **VPS partagé** (`gabee-vps`) comme un projet de plus :
le reverse-proxy **Traefik** déjà en place sert tous les projets, chaque projet
étant sa propre stack docker-compose sur le réseau Docker externe `web`.

Storefront → Vercel, Admin → Cloudflare Pages. Cette stack = **API + Postgres**.

```
                 Internet 80/443
                       │
              ┌────────▼────────┐
              │ Traefik (proxy) │  HTTPS auto (Let's Encrypt)  — réseau « web »
              └────────┬────────┘
        ┌──────────────┼───────────────┬───────────────┐
   gabee.app      kids.gabee.app   techies-connect   api.celva.store
        …               …               …                 │
                                              ┌────────────▼────────────┐
                                              │ api (NestJS) :3001       │
                                              └────────────┬────────────┘
                                                  réseau « internal » (privé)
                                              ┌────────────▼────────────┐
                                              │ Postgres   vol celva-db  │
                                              └──────────────────────────┘
```

Le proxy Traefik et le réseau `web` **existent déjà** sur le VPS (gérés depuis le
repo gabee, `deploy/proxy/`). On ne les recrée pas — on s'y branche via les labels.

---

## 1. Flow de deploy (2 environnements sur le même VPS)

[`deploy-api.yml`](../.github/workflows/deploy-api.yml) — même mécanique que gabee
(build → GHCR → SSH `compose up -d`), étendue à deux stacks isolées :

| Déclencheur | Env | Domaine | Projet compose | Image |
|---|---|---|---|---|
| push branche `develop` | **preprod** | `preprod.api.celva.store` | `celva-preprod` | `celva-api:develop` |
| push tag `v*` | **prod** | `api.celva.store` | `celva` | `celva-api:vX.Y.Z` (+ `:latest`) |

```bash
git push origin develop          # → redéploie preprod
git tag v1.0.0 && git push origin v1.0.0   # → déploie prod
```

Chaque deploy : **build-api** push l'image sur GHCR, puis **deploy** SSH sur le VPS,
`git checkout` le ref, `docker compose -p <projet> --env-file <env> pull && up -d`.
Le service `migrate` applique `prisma migrate deploy` avant que l'API ne (re)démarre.
Compose préfixe volumes/réseaux par nom de projet → les deux DB sont isolées ; seul
le **nom de routeur Traefik** est global, d'où `TRAEFIK_ROUTER` dans chaque env file.

Build local (sans CI) :
`docker compose -p celva -f deploy/docker-compose.yml --env-file deploy/.env.production up -d --build`.

---

## 2. Setup VPS (one-time)

Le VPS a déjà Docker, Traefik et le réseau `web`. Pour ajouter Celva :

```bash
# en tant qu'utilisateur deploy, à côté des autres projets (/home/deploy/*)
git clone https://github.com/iamvaln/celva.git ~/celva
cd ~/celva
cp deploy/.env.production.example deploy/.env.production   # PROD
cp deploy/.env.preprod.example    deploy/.env.preprod      # PREPROD
nano deploy/.env.production deploy/.env.preprod            # voir §3
```

> `APP_DIR` côté workflow = `~/celva` par défaut (override via le secret `VPS_APP_DIR`).

## 3. Variables (`deploy/.env.production` **et** `deploy/.env.preprod`)

À renseigner dans **chaque** fichier (réels **git-ignorés**, secrets DIFFÉRENTS par env) :

- `POSTGRES_PASSWORD` — fort (`openssl rand -base64 24`), **et reporte la même valeur
  dans `DATABASE_URL`** (host = `db`).
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` — `openssl rand -base64 32` chacun.
- `SEED_ADMIN_PASSWORD` — fort (`mustChangePassword=true` au 1er login).
- `API_DOMAIN` + `TRAEFIK_ROUTER` (déjà distincts dans les deux exemples), URLs front + `CORS_ORIGINS`.
- R2 (obligatoire pour l'upload média), Mailgun/Sentry si activés.

> ⚠️ À chaque `git pull`, compare avec l'exemple — de nouvelles variables peuvent
> apparaître dans `.env.production.example` sans être dans ton fichier réel :
> ```bash
> diff <(grep -vE '^\s*#' deploy/.env.production.example | grep = | cut -d= -f1 | sort) \
>      <(grep -vE '^\s*#' deploy/.env.production         | grep = | cut -d= -f1 | sort)
> ```

## 4. DNS (Cloudflare)

- [ ] `api.celva.store` → **A** vers l'IP du VPS (prod).
- [ ] `preprod.api.celva.store` → **A** vers l'IP du VPS (preprod).

Traefik gère le TLS via TLS-ALPN ; le proxy Cloudflare peut rester ON ou OFF.

## 5. Premier démarrage + secrets GitHub

```bash
# preprod
docker compose -p celva-preprod -f deploy/docker-compose.yml --env-file deploy/.env.preprod up -d --build
# prod
docker compose -p celva         -f deploy/docker-compose.yml --env-file deploy/.env.production up -d --build
curl https://preprod.api.celva.store/health   # {"status":"ok",...}
curl https://api.celva.store/health
```

Secrets repo (Settings → Secrets and variables → Actions) pour l'auto-deploy :

| Type | Nom | Valeur |
|------|-----|--------|
| Secret | `VPS_HOST` | IP / hostname du VPS |
| Secret | `VPS_USER` | utilisateur SSH (`deploy`) |
| Secret | `VPS_SSH_KEY` | clé privée de déploiement |
| Secret | `VPS_PORT` | port SSH (optionnel, défaut 22) |
| Secret | `VPS_APP_DIR` | optionnel, défaut `~/celva` |

`GITHUB_TOKEN` (login GHCR) est fourni automatiquement par Actions.

## 6. Seed one-shot (par base fraîche)

```bash
# preprod
docker compose -p celva-preprod -f deploy/docker-compose.yml --env-file deploy/.env.preprod \
  run --rm migrate npm run prisma:seed
# prod (après la 1ʳᵉ release tag)
docker compose -p celva         -f deploy/docker-compose.yml --env-file deploy/.env.production \
  run --rm migrate npm run prisma:seed
```
⚠️ Une seule fois par DB — le seed réécrit settings/zones et écraserait les édits admin.

### Catalogue de démo (produits + collections testables sur le storefront)

Deux étapes : les **images** vont dans R2 une fois par bucket, puis le **catalogue**
(lignes DB) référence ces images via des clés déterministes (`seed/products/<slug>/…`).
Le seed catalogue n'a donc **pas besoin** des fichiers images sur le VPS.

```bash
# 1) Images → R2 (une seule fois par bucket — preprod et prod partagent celva-media,
#    donc à ne lancer qu'une fois). Depuis une machine qui a docs/images + les creds R2 :
cd apps/api && node --env-file=.env --import tsx prisma/upload-seed-images.ts
#    (override la source avec SEED_IMAGES_DIR=/chemin/vers/images si besoin)

# 2) Catalogue (par DB) — référence les clés R2 déjà uploadées :
docker compose -p celva-preprod -f deploy/docker-compose.yml --env-file deploy/.env.preprod \
  run --rm migrate npm run prisma:seed:catalogue
```
ℹ️ Le seed catalogue est idempotent et ne touche que ses propres slugs
(`mino`, `nani`, `dafani`, `elegante` + ses 2 collections) — les produits créés
par l'admin ne sont jamais affectés.

## 7. Sauvegardes Postgres

```bash
# Dump
docker compose -f deploy/docker-compose.yml exec -T db \
  pg_dump -U celva celva | gzip > ~/backups/celva-$(date +%F).sql.gz
# Restore (préciser le projet pour viser la bonne DB)
gunzip -c ~/backups/celva-AAAA-MM-JJ.sql.gz | \
  docker compose -p celva -f deploy/docker-compose.yml exec -T db psql -U celva -d celva
```

> `docker compose exec` cible un projet : ajoute `-p celva` (prod) ou `-p celva-preprod`.
Le volume `celva-db` (préfixé par projet) persiste entre redéploiements
(`down` le garde, `down -v` le supprime).
