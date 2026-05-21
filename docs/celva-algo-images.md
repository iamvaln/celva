# Celva Store — Algo d'implémentation Images (R2 + CF Images Transformations)

> Docs officielles :
> - R2 : https://developers.cloudflare.com/r2/
> - R2 S3 API : https://developers.cloudflare.com/r2/api/s3/api/
> - R2 SDK JS v3 : https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
> - Images Transformations : https://developers.cloudflare.com/images/transform-images/
> - Transform via URL : https://developers.cloudflare.com/images/transform-images/transform-via-url/
> - Define source origin : https://developers.cloudflare.com/images/transform-images/sources/
> - Integrate with frameworks : https://developers.cloudflare.com/images/transform-images/integrate-with-frameworks/
> - Pricing : https://developers.cloudflare.com/images/pricing/

---

## Architecture

```
─────────────────────────────────────────────────────────────────────
                          UPLOAD (Admin)

  React-Admin → API NestJS → Validation → R2 (original uniquement)
                                (Multer)    (@aws-sdk/client-s3)

  DB: ProductImage.key = "products/{productId}/{uuid}.{ext}"
─────────────────────────────────────────────────────────────────────

─────────────────────────────────────────────────────────────────────
                         SERVING (Storefront)

  Next.js <Image>
       ↓
  /cdn-cgi/image/width=600,quality=80,format=auto/{R2_PUBLIC_URL}/key
       ↓
  Cloudflare Edge :
    - Cache hit  → sert directement
    - Cache miss → pull original depuis R2 → transforme → cache
       ↓
  Navigateur : reçoit l'image optimisée (WebP/AVIF auto)
─────────────────────────────────────────────────────────────────────
```

**Sharp est supprimé.** Aucune transformation côté serveur. L'original est stocké sur R2, Cloudflare transforme à la volée au edge.

---

## 1. Setup Cloudflare

### 1.1 Créer le bucket R2

- Dashboard Cloudflare → R2 → Create bucket
- Nom : `celva-media`
- Location hint : Europe (ou auto)
- Activer l'accès public via custom domain : `media.celva.store`

> Docs : https://developers.cloudflare.com/r2/buckets/public-buckets/

### 1.2 Créer les credentials API

- Dashboard → R2 → API Tokens → Create API Token
- Permissions : Object Read & Write sur le bucket `celva-media`
- Récupérer : Account ID, Access Key ID, Secret Access Key
- Endpoint S3 : `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`

### 1.3 Activer Images Transformations

- Dashboard → Images → Transformations
- Activer les transformations sur la zone `celva.store`
- Sources : ajouter `media.celva.store` dans les origines autorisées
- Cela permet à `celva.store/cdn-cgi/image/...` de transformer les images servies depuis `media.celva.store`

### 1.4 Configurer CORS sur le bucket R2

> Docs : https://developers.cloudflare.com/r2/buckets/cors/

Autoriser les uploads depuis `admin.celva.store` (l'admin) :

```json
[
  {
    "AllowedOrigins": ["https://admin.celva.store", "http://localhost:5173"],
    "AllowedMethods": ["PUT", "GET", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 2. API NestJS — Module Images

### 2.1 Dépendances

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
npm install -D @types/multer
```

**NE PAS installer Sharp.** Les transformations sont faites par Cloudflare au edge.

### 2.2 Variables d'environnement

```env
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=celva-media
R2_ENDPOINT=https://{ACCOUNT_ID}.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.celva.store
CF_IMAGES_BASE_URL=https://celva.store/cdn-cgi/image
```

### 2.3 R2Service (service injectable NestJS)

```typescript
// Algo — le code exact doit être implémenté en suivant la doc officielle
// Docs : https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/

class R2Service {

  // Initialiser le client S3 avec les credentials R2
  // endpoint = R2_ENDPOINT
  // region = "auto"
  // credentials = { accessKeyId, secretAccessKey }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    // 1. Valider le type MIME réel (pas juste l'extension)
    //    Acceptés : image/jpeg, image/png, image/webp
    //    Rejeté : tout le reste
    //
    // 2. Valider la taille : max 5 Mo
    //
    // 3. Générer la clé R2 :
    //    key = "{entity}/{entityId}/{uuid}.{ext}"
    //    ex: "products/abc123/550e8400-e29b.jpg"
    //    ex: "materials/def456/660e9500-f30c.png"
    //
    // 4. Upload vers R2 via PutObjectCommand
    //    - Key = la clé générée
    //    - Body = le buffer du fichier
    //    - ContentType = le MIME type réel
    //    - CacheControl = "public, max-age=31536000, immutable"
    //      (les images ne changent jamais, on les supprime et re-upload)
    //
    // 5. Retourner la clé R2 (pas l'URL complète, juste la clé)
    return key;
  }

  async delete(key: string): Promise<void> {
    // DeleteObjectCommand avec la clé
  }

  async deleteMany(keys: string[]): Promise<void> {
    // DeleteObjectsCommand avec la liste de clés
    // (batch delete, max 1000 par appel)
  }

  getPublicUrl(key: string): string {
    // Retourne l'URL publique directe (sans transformation)
    // return `${R2_PUBLIC_URL}/${key}`
    // ex: "https://media.celva.store/products/abc123/550e8400.jpg"
  }

  getTransformedUrl(key: string, options: TransformOptions): string {
    // Construit l'URL de transformation Cloudflare
    // Format : /cdn-cgi/image/{options}/{source}
    //
    // options possibles : width, height, quality, format, fit, gravity
    // format=auto → Cloudflare choisit WebP/AVIF selon le navigateur
    //
    // return `${CF_IMAGES_BASE_URL}/${optionsString}/${R2_PUBLIC_URL}/${key}`
    // ex: "https://celva.store/cdn-cgi/image/width=600,quality=80,format=auto/https://media.celva.store/products/abc123/550e8400.jpg"
  }
}

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;    // 1-100, défaut 80
  format?: 'auto' | 'webp' | 'avif' | 'json';  // auto = négociation navigateur
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  gravity?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right';
}
```

### 2.4 ImageController — endpoints

```
POST   /v1/products/:productId/images
       - Multer : max 5 fichiers simultanés, max 5 Mo chacun
       - Pour chaque fichier :
         1. R2Service.upload(file, "products/{productId}/{uuid}.{ext}")
         2. Créer ProductImage en DB (key, position, isPrimary)
       - Retourne les ProductImages créées

DELETE /v1/products/:productId/images/:imageId
       - Récupérer la clé depuis la DB
       - R2Service.delete(key)
       - Supprimer le ProductImage en DB

PATCH  /v1/products/:productId/images/reorder
       - Body : [{ id, position }]
       - Mettre à jour les positions en DB

PATCH  /v1/products/:productId/images/:imageId/primary
       - Mettre isPrimary = true sur cette image
       - Mettre isPrimary = false sur toutes les autres du produit

POST   /v1/raw-materials/:materialId/image
       - Même logique mais clé = "materials/{materialId}/{uuid}.{ext}"
       - Un seul fichier, pas de galerie
       - Stocké dans RawMaterial.imageKey
```

### 2.5 Serialization — ce que l'API retourne

Quand l'API retourne un ProductImage ou un produit, elle enrichit la clé R2 avec les URLs de transformation précalculées :

```typescript
// Algo du serializer/transformer

function serializeProductImage(image: ProductImage) {
  return {
    id: image.id,
    key: image.key,
    altText: image.altText,
    position: image.position,
    isPrimary: image.isPrimary,
    urls: {
      // URL directe (original, pour zoom ou téléchargement)
      original: r2Service.getPublicUrl(image.key),

      // URLs transformées (pour le storefront)
      large:  r2Service.getTransformedUrl(image.key, { width: 1200, quality: 80, format: 'auto', fit: 'scale-down' }),
      medium: r2Service.getTransformedUrl(image.key, { width: 600,  quality: 80, format: 'auto', fit: 'scale-down' }),
      thumb:  r2Service.getTransformedUrl(image.key, { width: 300,  quality: 80, format: 'auto', fit: 'cover' }),
    }
  };
}
```

Le storefront ne construit JAMAIS d'URL lui-même — il utilise les URLs retournées par l'API.

---

## 3. Storefront Next.js — Affichage

### 3.1 Composant Image produit

```tsx
// Algo — utiliser le composant <Image> de Next.js
// Docs : https://nextjs.org/docs/app/building-your-application/optimizing/images

// Le composant reçoit les URLs pré-calculées depuis l'API
// Il utilise srcSet pour servir la bonne taille selon le viewport

<Image
  src={image.urls.large}           // src principale
  alt={getTranslation(image.altText, locale)}
  width={1200}
  height={1600}                     // ratio 3:4
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL={tinyBlurPlaceholder}  // placeholder généré côté serveur ou statique
  className="..."
  loading="lazy"                     // sauf pour le premier produit visible
/>
```

### 3.2 Contextes d'utilisation

| Contexte | URL utilisée | Taille réelle | Raison |
|----------|-------------|---------------|--------|
| Grille catalogue (card) | `urls.thumb` | 300px | Petite vignette, chargement rapide |
| Grille catalogue hover (2e image) | `urls.medium` | 600px | Image intermédiaire au survol |
| Fiche produit (galerie) | `urls.large` | 1200px | Image principale grande |
| Fiche produit (zoom/lightbox) | `urls.original` | Taille native | Zoom pleine résolution |
| Cross-sell | `urls.thumb` | 300px | Petites vignettes |
| Accueil (hero/collection) | `urls.large` | 1200px | Grand visuel |
| Admin (liste) | `urls.thumb` | 300px | Vignette de prévisualisation |

### 3.3 Configuration Next.js

```javascript
// next.config.js
// Autoriser le domaine R2 et le domaine de transformation

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.celva.store',  // R2 public
      },
      {
        protocol: 'https',
        hostname: 'celva.store',        // cdn-cgi transformations
        pathname: '/cdn-cgi/image/**',
      },
    ],
  },
};
```

---

## 4. Admin React-Admin — Upload

### 4.1 Flow d'upload dans le formulaire produit

```
1. L'admin drag & drop des images dans le formulaire produit
2. Le frontend envoie les fichiers via FormData à POST /v1/products/:id/images
3. L'API valide, upload sur R2, crée les enregistrements DB
4. L'API retourne les ProductImages avec les URLs pré-calculées
5. Le formulaire affiche les previews avec les URLs thumb
6. L'admin peut réordonner (drag & drop) → PATCH .../reorder
7. L'admin peut définir l'image principale → PATCH .../primary
8. L'admin peut supprimer → DELETE (supprime sur R2 + en DB)
```

---

## 5. Facturation et limites

### Cloudflare Images Transformations (plan gratuit)

- 5 000 transformations uniques / mois gratuites
- Une "transformation unique" = une combinaison source + paramètres jamais vue ce mois
- Après : cachée et servie gratuitement (pas de coût par requête)

### Estimation Celva au lancement

- ~20 produits × 5 images = 100 images
- × 3 tailles (thumb, medium, large) = 300 transformations uniques
- + images RawMaterial (~20) × 1 taille = 20
- + images collections, articles, etc. = ~50
- **Total ≈ 370 transformations / mois** — largement dans le plan gratuit

### Cloudflare R2

- Stockage : 10 Go gratuit / mois
- Requêtes : 10M reads gratuit / mois, 1M writes gratuit / mois
- Estimation : 100 images × 2 Mo moyen = 200 Mo — largement gratuit

---

## 6. Avantages vs R2 + Sharp

| | R2 + Sharp (ancien) | R2 + CF Transformations (nouveau) |
|---|---|---|
| Dépendances API | @aws-sdk/client-s3 + sharp | @aws-sdk/client-s3 uniquement |
| Stockage par image | 4 fichiers (original + 3 variantes) | 1 fichier (original uniquement) |
| CPU serveur à l'upload | Élevé (transformation Sharp) | Quasi nul (simple upload) |
| Temps d'upload | Plus long (transformation) | Plus court (upload direct) |
| Latence au premier affichage | Immédiat (pré-généré) | ~100ms de plus (1ère transformation) |
| Formats auto (WebP/AVIF) | Manuel | Automatique (format=auto) |
| Gestion des tailles | Hardcodées (300/600/1200) | Flexible (n'importe quelle taille via URL) |
| Coût stockage | ×4 | ×1 |
| Code à maintenir | ImageService + Sharp config | R2Service uniquement |

### Seul inconvénient

La toute première requête vers une combinaison taille+image jamais vue est légèrement plus lente (~100-200ms) car Cloudflare doit pull l'original depuis R2 et transformer. Après, c'est caché au edge mondial. En pratique, c'est imperceptible.

---

## 7. Checklist de mise à jour des docs

Les documents suivants doivent être mis à jour pour refléter ce changement :

- [x] **celva-agent-guide.md** : remplacer "R2 + Sharp" par "R2 + CF Images Transformations", supprimer Sharp des dépendances, mettre à jour le module images, ajouter les étapes de setup Cloudflare
- [x] **celva-specs.md** : mettre à jour la section Images (4.5) pour refléter le nouveau flow
- [ ] **celva-brief-visuel.md** : section images déjà compatible (juste servir les bonnes URLs)
- [ ] **celva-schema.md** : aucun changement nécessaire (ProductImage.key reste une clé R2)
