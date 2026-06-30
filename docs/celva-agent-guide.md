# Celva Store — Guide de Setup pour Agent de Code (v4 Final)

> Ce document est destiné à un agent de code pour initialiser et développer le projet Celva Store. Chaque section référence la documentation officielle. L'agent doit toujours consulter la documentation officielle pour les dernières versions et bonnes pratiques.

---

## 0. Principes transversaux obligatoires

Ces principes s'appliquent à TOUTE ligne de code, sans exception.

### Bilingue FR/EN
- Toutes les interfaces sont bilingues français (défaut) / anglais
- Aucun texte en dur — tout passe par les fichiers de traduction
- Les entités client-facing stockent les textes en JSON : `{ "fr": "...", "en": "..." }`
- Les messages d'erreur API sont bilingues (header `Accept-Language`)

### Responsive
- Mobile-first design
- Breakpoints : mobile (< 640px), tablette (640-1024px), desktop (> 1024px)

### Light/Dark Mode
- Respecter `prefers-color-scheme` par défaut
- Toggle manuel disponible
- CSS variables ou système de thème Tailwind pour tous les tokens

### Accessibilité (a11y)
- WCAG 2.1 niveau AA minimum
- Navigation clavier complète, contrastes suffisants (light ET dark), attributs ARIA, alt-text, labels, focus visible, skip to content, annonces lecteurs d'écran

### SEO (storefront)
- Meta tags dynamiques (title, description, canonical)
- Open Graph + Twitter Cards
- Schema.org (Product, Organization, Article, BreadcrumbList, CollectionPage)
- Sitemap XML auto, robots.txt, URLs slugifiées, hreflang FR/EN, structured data prix/dispo

### Low Data Consumption
- Lazy loading images et composants below the fold
- Images WebP avec srcset responsive (thumb/medium/large)
- Pagination 12-20 items/page
- Fonts auto-hébergées et subset
- Code splitting natif Next.js
- Compression gzip/brotli sur l'API
- Cache HTTP agressif assets statiques et images R2
- Pas de librairies lourdes sans justification — vérifier bundle size
- Service Worker pour cache offline (PWA livreur)

### Sécurité by Design
- HTTPS obligatoire
- Headers : CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy
- Sanitization de TOUS les inputs (class-validator côté NestJS, Zod côté Next.js)
- Protection CSRF
- Rate limiting IP global (100 req/min) + spécifique (login 5/15min, signup 3/h, paiement 10/min)
- Prisma = parameterized queries. JAMAIS de raw SQL sans paramètres
- Mots de passe hashés bcrypt (min 10 rounds)
- JWT access 15min, refresh 7j en httpOnly secure cookie, JAMAIS dans localStorage
- CORS strict (domaines autorisés uniquement)
- Upload : validation MIME réel, max 5 Mo
- Numéros MoMo/OM masqués en affichage (2 derniers chiffres visibles)
- Pas de données sensibles dans les logs

### GDPR Compliance
- Bandeau consentement cookies opt-in
- Pas de tracking avant consentement
- Pages /privacy et /terms
- Droit d'accès : export données personnelles depuis l'espace client
- Droit à l'effacement : soft delete + anonymisation après 30 jours
- Données paiement masquées en base
- Double opt-in newsletter
- Rétention : logs 90 jours, audit logs 2 ans, données client tant que compte actif + 30j, factures 10 ans (obligation légale)

### Observabilité
- Logging structuré JSON avec Pino : ERROR, WARN, INFO, DEBUG (défaut prod : INFO)
- Chaque requête : timestamp, method, path, status, durée, userId, appSource, IP hashée
- Erreurs : stack trace, context, request ID
- Request ID (UUID) propagé via header X-Request-Id
- Health check /health (DB, disk, memory)
- Métriques : req/sec, latence p50/p95/p99, erreurs 4xx/5xx, connexions DB
- Intégration : Sentry (errors), Plausible ou Umami (analytics RGPD)

### Tracking activation et rétention
Événements côté storefront (après consentement GDPR) :
- Activation : signup_completed, first_product_viewed, first_add_to_cart, first_order_completed
- Rétention : session_started, product_viewed, add_to_cart, checkout_started, order_completed, wishlist_added, promo_code_used
- Engagement : newsletter_subscribed, blog_article_viewed, size_guide_opened

Analytics RGPD-friendly (Plausible/Umami custom events). AuditLog côté serveur.

---

## 1. Monorepo Turborepo

> Docs : https://turbo.build/repo/docs
> Docs pnpm : https://pnpm.io/workspaces

### Structure
```
celva/
├── apps/
│   ├── storefront/          # Next.js — celva.store
│   ├── admin/               # React-Admin — admin.celva.store
│   ├── delivery/            # React + Tailwind PWA — livraison.celva.store (Phase 4)
│   └── api/                 # NestJS — api.celva.store
├── packages/
│   ├── shared/              # Types, enums, constantes, utils (TypeScript pur)
│   ├── ui/                  # Composants UI partagés (optionnel)
│   └── config/              # ESLint, TSConfig, Tailwind configs
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── .github/workflows/ci.yml
```

```bash
npx create-turbo@latest celva --package-manager pnpm
```

### packages/shared
Source de vérité pour types, enums, constantes. TypeScript pur, zéro dépendance runtime. Importé par toutes les apps via le workspace.

---

## 2. API — NestJS

> Docs : https://docs.nestjs.com/
> Docs Prisma : https://www.prisma.io/docs

### Scaffolding
```bash
cd apps/ && nest new api --package-manager pnpm --strict
```

### Modules
```
apps/api/src/
├── common/                    # Guards, interceptors, filters, decorators
│   ├── guards/roles.guard.ts
│   ├── interceptors/
│   │   ├── audit-log.interceptor.ts
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── filters/http-exception.filter.ts   # Erreurs bilingues
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   └── app-source.decorator.ts
│   └── middleware/rate-limit.middleware.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── categories/
│   ├── products/              # + attributs + variantes
│   ├── images/                # Upload R2 + Sharp
│   ├── collections/
│   ├── suppliers/
│   ├── raw-materials/
│   ├── purchase-orders/
│   ├── production-orders/
│   ├── stock-movements/       # Service central de gestion du stock
│   ├── cart/
│   ├── wishlist/
│   ├── orders/
│   ├── promo-codes/
│   ├── payments/
│   ├── invoices/              # Génération factures, PDF, envoi email
│   ├── deliveries/
│   ├── pickup-points/
│   ├── consignments/
│   ├── commissions/
│   ├── articles/
│   ├── size-guides/
│   ├── newsletter/
│   ├── transactions/
│   ├── notifications/
│   ├── settings/
│   └── audit-logs/
├── prisma/
└── config/
```

### Prisma
> Docs : https://www.prisma.io/docs

Copier le schema v4 fourni dans `apps/api/prisma/schema.prisma`.
```bash
pnpm add prisma @prisma/client
npx prisma migrate dev --name init
```
PrismaService injectable : https://docs.nestjs.com/recipes/prisma

### Validation
> Docs class-validator : https://github.com/typestack/class-validator

```bash
pnpm add class-validator class-transformer
```
ValidationPipe global dans main.ts. Chaque endpoint a son DTO. NE PAS utiliser Joi.

### Sécurité
> Docs Helmet : https://docs.nestjs.com/security/helmet
> Docs Rate Limiting : https://docs.nestjs.com/security/rate-limiting

```bash
pnpm add @nestjs/throttler helmet
```
CORS : celva.store, admin.celva.store, livraison.celva.store + localhost en dev.

### Auth JWT
> Docs : https://docs.nestjs.com/security/authentication

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
```

### StockMovementService (CRITIQUE)
Service central injectable. SEUL point d'entrée pour modifier le stock d'une variante. Tous les modules passent par ce service. Il : crée le StockMovement, met à jour le stock (increment/decrement atomique Prisma), vérifie les seuils d'alerte. Le stock ne doit JAMAIS être modifié directement ailleurs.

### InvoiceService
Service qui : génère le numéro séquentiel (CLV-INV-YYYYMM-XXXX, atomique), calcule HT/TVA/TTC depuis les OrderItems, génère le PDF depuis un template HTML via Puppeteer (https://pptr.dev/) ou @react-pdf/renderer (https://react-pdf.org/), upload sur R2, envoie l'email avec le PDF. Se déclenche auto quand Payment passe en COMPLETED.

### Upload images R2 + Cloudflare Images Transformations
> Docs R2 S3 API : https://developers.cloudflare.com/r2/api/s3/
> Docs Images Transformations : https://developers.cloudflare.com/images/transform-images/
> Algo détaillé : [celva-algo-images.md](./celva-algo-images.md) — lecture obligatoire pour ce module.

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
npm install -D @types/multer
```

**Pas de Sharp.** L'API NestJS stocke seulement l'original sur R2 (`{entity}/{id}/{uuid}.{ext}`) ; les variantes (thumb 300 / medium 600 / large 1200) sont générées par Cloudflare à la volée via `https://media.celva.store/cdn-cgi/image/width=…,quality=…,format=auto/<R2_PUBLIC_URL>/<key>`. L'API sérialise les URLs précalculées dans la réponse (`urls.original`, `urls.large`, `urls.medium`, `urls.thumb`) — le storefront/admin ne reconstruit jamais d'URL côté client.

Variables d'env requises (voir `apps/api/.env.example`) :
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `R2_ENDPOINT=https://{ACCOUNT_ID}.r2.cloudflarestorage.com`
- `R2_PUBLIC_URL=https://media.celva.store`
- `CF_IMAGES_BASE_URL=https://media.celva.store/cdn-cgi/image`

Même pipeline pour `ProductImage` et `RawMaterial.imageKey`.

### i18n API
> Docs : https://nestjs-i18n.com/

```bash
pnpm add nestjs-i18n
```
Messages d'erreur selon Accept-Language. Fichiers `src/i18n/fr/` et `src/i18n/en/`.

### Logging
> Docs Pino : https://github.com/pinojs/pino

```bash
pnpm add nestjs-pino pino pino-http && pnpm add -D pino-pretty
```

### Swagger
> Docs : https://docs.nestjs.com/openapi/introduction

```bash
pnpm add @nestjs/swagger
```
Endpoint `/api/docs`. API versionée /v1/.

### Health Check
> Docs : https://docs.nestjs.com/recipes/terminus

```bash
pnpm add @nestjs/terminus
```

### Sentry
> Docs : https://docs.sentry.io/platforms/javascript/guides/nestjs/

```bash
pnpm add @sentry/nestjs @sentry/profiling-node
```

---

## 3. Storefront — Next.js

> Docs : https://nextjs.org/docs

### Scaffolding
```bash
pnpm create next-app storefront --typescript --tailwind --eslint --app --src-dir
```
App Router uniquement.

### Proxy API (OBLIGATOIRE)
> Docs : https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites

NE PAS appeler api.celva.store depuis le navigateur. Configurer dans next.config.js :
```javascript
async rewrites() {
  return [{ source: '/api/:path*', destination: 'https://api.celva.store/v1/:path*' }]
}
```
Le client appelle celva.store/api/*, Next.js forward côté serveur. Pas de CORS, URL API non exposée.

### i18n FR/EN
> Docs next-intl : https://next-intl-docs.vercel.app/docs/getting-started

```bash
pnpm add next-intl
```
FR défaut. URLs : celva.store/fr/boutique, celva.store/en/shop. Hreflang auto.

### Tailwind + Dark Mode
> Docs : https://tailwindcss.com/docs/dark-mode

Dark mode strategy `class`. Tokens couleur Celva.

### Composants UI
> Docs shadcn/ui : https://ui.shadcn.com/docs

```bash
pnpm dlx shadcn@latest init
```
Basé sur Radix (accessible). NE PAS installer MUI, Ant Design, etc.

### Validation formulaires
> Docs Zod : https://zod.dev/
> Docs react-hook-form : https://react-hook-form.com/
> Docs resolvers : https://github.com/react-hook-form/resolvers

```bash
pnpm add zod react-hook-form @hookform/resolvers
```
NE PAS utiliser Joi.

### SEO
> Docs Metadata : https://nextjs.org/docs/app/building-your-application/optimizing/metadata
> Docs next-sitemap : https://github.com/iamvishnusankar/next-sitemap

generateMetadata() sur chaque page dynamique. JSON-LD Schema.org. next-sitemap.

### Fonts
> Docs : https://nextjs.org/docs/app/building-your-application/optimizing/fonts

`next/font/local`. Pas de Google Fonts CDN. Subset FR/EN.

### Images
> Docs : https://nextjs.org/docs/app/building-your-application/optimizing/images

`<Image>` avec sizes/srcSet pointant vers les variantes R2. remotePatterns configuré.

### Analytics
> Docs Plausible : https://plausible.io/docs — ou Umami : https://umami.is/docs

UNIQUEMENT après consentement cookies.

### Pages statiques
```
src/app/[locale]/about/page.tsx
src/app/[locale]/process/page.tsx
src/app/[locale]/faq/page.tsx
src/app/[locale]/contact/page.tsx
src/app/[locale]/terms/page.tsx
src/app/[locale]/privacy/page.tsx
```
Textes dans src/messages/fr.json et en.json. Pas de CMS.

---

## 4. Admin — React-Admin

> Docs : https://marmelab.com/react-admin/documentation.html

```bash
pnpm create react-admin admin
```

Data provider custom ou ra-data-simple-rest, header X-App-Source: WEB_ADMIN. Auth provider custom (JWT + refresh cookie + rôles). i18n avec ra-language-french/english. Thème light/dark custom. SPA statique → Cloudflare Pages.

---

## 5. App Livreur — React PWA (Phase 4)

> Docs Vite : https://vite.dev/guide/
> Docs PWA : https://vite-pwa-org.netlify.app/guide/
> Docs react-i18next : https://react.i18next.com/

NE PAS scaffolder en Phase 1. Scaffolder en Phase 4 quand le module livraison est développé.

```bash
pnpm create vite delivery --template react-ts
pnpm add tailwindcss @tailwindcss/vite vite-plugin-pwa react-i18next i18next
```
100% mobile. Header X-App-Source: WEB_DELIVERY. PWA installable. FR défaut.

---

## 6. Prisma Schema

Copier le schema v4 fourni dans `celva-schema-v4.md` vers `apps/api/prisma/schema.prisma`.

### Seed
> Docs : https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding

Fichier `apps/api/prisma/seed.ts` :
- Admin par défaut (admin@celva.store)
- Settings par défaut (TAX_RATE, INVOICE_COMPANY_NAME, INVOICE_TAX_ID, INVOICE_ADDRESS, MAX_CASH_ON_DELIVERY, ORDER_AUTO_COMPLETE_DAYS, CONSIGNMENT_ALERT_DAYS, NEWSLETTER_PROMO_CODE, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_WHATSAPP, FREE_DELIVERY_ENABLED, R2_BUCKET_URL)
- Catégories de base
- DeliveryZones (Douala, Yaoundé, National)
- PickupPoint magasin Celva

---

## 7. Variables d'environnement

### apps/api/.env
```env
DATABASE_URL=postgresql://user:password@localhost:5432/celva
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRATION=7d
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=celva-media
R2_PUBLIC_URL=https://media.celva.store
CORS_ORIGINS=https://celva.store,https://admin.celva.store,https://livraison.celva.store
SENTRY_DSN=
EMAIL_PROVIDER=resend
RESEND_API_KEY=
NODE_ENV=development
PORT=3001
API_VERSION=v1
```

### apps/storefront/.env.local
```env
NEXT_PUBLIC_API_URL=https://api.celva.store/v1
NEXT_PUBLIC_R2_URL=https://media.celva.store
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=celva.store
NEXT_PUBLIC_DEFAULT_LOCALE=fr
```

### apps/admin/.env + apps/delivery/.env
```env
VITE_API_URL=https://api.celva.store/v1
```

---

## 8. CI/CD

> Docs GitHub Actions : https://docs.github.com/en/actions
> Docs Turborepo CI : https://turbo.build/repo/docs/guides/ci-vendors/github-actions
> Docs Vercel CLI : https://vercel.com/docs/cli
> Docs Wrangler : https://developers.cloudflare.com/workers/wrangler/
> Docs Railway CLI : https://docs.railway.com/guides/cli

Workflow sur push main/develop et PR. Cache Turborepo. Install → Lint → Typecheck → Test → Build. Déploiement sur main : storefront → Vercel, admin → Cloudflare Pages, api → Railway. main = production, develop = staging.

### Vercel (storefront)
> Docs monorepo : https://vercel.com/docs/monorepos/turborepo

Root Directory : apps/storefront. Build : `cd ../.. && pnpm turbo build --filter=storefront`.

### Cloudflare Pages (admin)
> Docs : https://developers.cloudflare.com/pages/

Build : `cd apps/admin && pnpm build`. Output : apps/admin/dist. Domain : admin.celva.store.

### Railway (API)
> Docs : https://docs.railway.com/

Dockerfile dans apps/api/. PostgreSQL provisionné sur Railway. Domain : api.celva.store.

---

## 9. Ordre d'exécution Phase 1

1. Initialiser monorepo Turborepo avec pnpm
2. Créer packages/shared (types, enums, constantes depuis schema v4)
3. Scaffolder apps/api (NestJS)
4. Configurer Prisma + schema v4 + migration initiale
5. Créer PrismaService injectable
6. Créer StockMovementService (service central stock)
7. Configurer guards, interceptors, filters globaux (auth, roles, audit log, logging, rate limiting, errors bilingues)
8. Module Auth (signup, login, refresh, logout, forgot/reset password)
9. Module Users (CRUD admin)
10. Module Settings (CRUD admin)
11. Créer le seed
12. Configurer Swagger
13. Scaffolder apps/admin (React-Admin)
14. Configurer data provider + auth provider + header X-App-Source
15. Vues admin Users + Settings
16. Scaffolder apps/storefront (Next.js)
17. Configurer next-intl (FR/EN, FR défaut)
18. Configurer Tailwind + dark mode
19. Configurer proxy API (rewrites next.config.js)
20. Layout de base (header, footer, navigation, bandeau cookies)
21. Pages statiques (about, process, FAQ, contact, terms, privacy)
22. CI/CD GitHub Actions (API + Admin + Storefront)

### Validation Phase 1
- Login admin sur admin.celva.store ✓
- CRUD users et settings ✓
- Storefront avec layout, navigation, pages statiques, FR/EN, light/dark ✓
- API sur celva.store/api/health (proxy) et api.celva.store/api/docs (Swagger) ✓
- AuditLog avec appSource ✓
- Rate limiting fonctionnel ✓

---

## Références

| Outil | Documentation |
|-------|--------------|
| Turborepo | https://turbo.build/repo/docs |
| pnpm | https://pnpm.io/motivation |
| NestJS | https://docs.nestjs.com/ |
| Prisma | https://www.prisma.io/docs |
| Next.js | https://nextjs.org/docs |
| React-Admin | https://marmelab.com/react-admin/documentation.html |
| React | https://react.dev/ |
| Vite | https://vite.dev/guide/ |
| Tailwind CSS | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com/docs |
| next-intl | https://next-intl-docs.vercel.app/docs/getting-started |
| react-i18next | https://react.i18next.com/ |
| Zod | https://zod.dev/ |
| react-hook-form | https://react-hook-form.com/ |
| Sharp | https://sharp.pixelplumbing.com/ |
| Cloudflare R2 | https://developers.cloudflare.com/r2/ |
| Cloudflare Pages | https://developers.cloudflare.com/pages/ |
| Vercel | https://vercel.com/docs |
| Railway | https://docs.railway.com/ |
| Passport NestJS | https://docs.nestjs.com/recipes/passport |
| class-validator | https://github.com/typestack/class-validator |
| Pino | https://github.com/pinojs/pino |
| Sentry | https://docs.sentry.io/platforms/javascript/guides/nestjs/ |
| Plausible | https://plausible.io/docs |
| Umami | https://umami.is/docs |
| Puppeteer | https://pptr.dev/ |
| @react-pdf/renderer | https://react-pdf.org/ |
| vite-plugin-pwa | https://vite-pwa-org.netlify.app/guide/ |
| Helmet | https://helmetjs.github.io/ |
| GitHub Actions | https://docs.github.com/en/actions |
| next-sitemap | https://github.com/iamvishnusankar/next-sitemap |
