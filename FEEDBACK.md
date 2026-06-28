# Test Feedback

Running list of feedback found while testing. To be treated later.

Status legend: 🔲 open · 🔄 in progress · ✅ done

## Catalog

- ✅ When editing a product name, the slug should follow (auto-update) the name.
      New shared `SlugInput` (admin/src/components/SlugInput.tsx) auto-derives the slug from name.fr
      until edited, and slugifies on input. Applied to products/categories/collections/studio.
- ✅ No button to create a product on the products page — added a "Nouveau produit" button to the
      custom ProductList toolbar (→ create route).

## Collections

- ✅ When creating a collection, the image is now an upload control — `CollectionCreate` uses
      `ImageDropInput` (matching `CollectionEdit`), replacing the plain URL `TextInput`.

## Admin / Back-office

- ✅ Breadcrumbs added across the back-office — new `Breadcrumb.tsx` (Home → resource → action),
      wired into `CelvaLayout` under the AppBar, using RA resource labels (no new i18n keys).

## Studio

- ✅ All slug fields now slugify input (shared `SlugInput` used everywhere).
- ✅ Studio slug now ordered after the name (StudioFamily Create/Edit reordered: name → slug).

## Storefront — Product detail

- ✅ Selecting a colour swaps the main image — now via a STRUCTURED link (heuristic removed).
      Added `ProductImage.attributeValueId` (+ migration), API endpoint `PATCH
      /products/:id/images/:imageId/color`, an admin per-image colour selector in
      ProductImagesPanel, and seed tagging. Storefront matches the selected value id exactly →
      `ProductDetailColumns` switches the hero. Works for admin-created products too.
- ✅ Clicking a thumbnail promotes it to the main image — `ProductGallery` (client), real buttons
      (keyboard + aria), shares active-image state with the colour selector.
- ✅ Added a hover "loupe" (zoom) on the main product image: it scales and pans with the cursor
      (uses the large image), with a magnifier affordance badge.

## Storefront — Pages, Footer & Contact

- ✅ Help page created at `/aide` (EN `/help`) with Shipping / Returns / Care sections (anchors
      #livraison/#retours/#entretien) + `static.help` i18n. Footer links now resolve.
- ✅ "Our story" → /about (kept), "Atelier" → /process (the "Notre processus" page) — no longer
      the same page.
- ✅ Contact form added: `ContactForm` (name/email/message) → new `POST /api/v1/contact` which
      emails the team (CONTACT_EMAIL setting) via Mailgun.
- 🔲 WhatsApp/phone on contact page: both WhatsApp values read the same `contactWhatsapp` setting.
      Per user, #4 is just "set the correct phone number" → set CONTACT_PHONE in admin Settings
      (pending the number from the user).
- 🔲 Newsletter image: still needs a decision — no image in the code; awaiting what it should be.
- ✅ Size guides seeded (robes/hauts/jupes, bilingual markdown w/ GFM measurement tables) so
      `/size-guides` isn't empty.
- ✅ Appointment discoverability: added a "Prenez rendez-vous à l'atelier" CTA on the contact page
      linking to /studio (where the rdv form lives).

## AI Assistance

- ✅ DONE (2026-06-28): AI assist to autofill FR/EN + descriptions. /ai/translate +
      /ai/generate-description (pluggable provider/model, default anthropic/claude-opus-4-8),
      admin buttons on the forms, usage tracking (AiUsage) + /ai-metrics back-office page.
      Requires ANTHROPIC_API_KEY on the env (set).

## Storefront — Product detail (colour→image)

- ✅ DONE via heuristic (2026-06-28): colour selection swaps the main image by matching the colour
      label against image alt text (no schema change). See the Product-detail section above.
      Future hardening (optional): add a structured image↔attribute-value link so it works for
      admin-created products that don't put the colour in the alt text.

## UX / Onboarding

- 🔄 Seed attributes and other meta (default data) so the admin isn't empty on first use.
      Reworked the catalogue seed into a decoupled two-step flow:
        • `prisma/upload-seed-images.ts` (`npm run prisma:seed:images`) pushes the originals to
          storage (R2 in preprod/prod) at deterministic keys `seed/products/<slug>/<file>`.
          ✅ Already run against the shared `celva-media` bucket — all 14 images return 200.
        • `prisma/seed-catalogue.ts` now just creates DB rows referencing those keys (no image
          files needed on the box), fixes the `role: 'ADMIN'` crash, and seeds collection heroes.
        • Shared data extracted to `prisma/catalogue-seed-data.ts` + `prisma/seed-storage.ts`.
      Verified end-to-end on a throwaway DB; all seeded keys resolve 200 from R2. Deploy steps
      documented in deploy/DEPLOY.md §6.
      ✅ PREPROD SEEDED (2026-06-28): ran the catalogue seed against the preprod stack (overlaid
      the 3 fixed files into the migrate container since the fix is still uncommitted). Preprod DB
      now has 4 products, 12 images, 2 collections, 11 stock movements; the public API
      (preprod.api.celva.store/api/v1) serves them and R2 originals return 200.
      Remaining: commit/deploy the fix so the image carries it (currently only overlaid at runtime),
      and confirm product thumbnails once CF Images is sorted (below).
- ✅ Cloudflare Images Transformations were 404ing: `CF_IMAGES_BASE_URL` pointed at
      `celva.store/cdn-cgi/image` (celva.store is on Vercel, not Cloudflare) — the resize endpoint
      only works on a Cloudflare-proxied zone. Fixed by repointing to
      `media.celva.store/cdn-cgi/image` (the R2/Cloudflare zone). Updated preprod env + restarted
      API; transform URLs now 200 (cf-resized: ok). Also corrected the hardcoded default in
      storage.module.ts + seed-storage.ts + all .env examples + docs.
- ✅ `/collections` returned 404: nav (Header/Footer/MobileMenu) links to `/collections` but only
      `collections/[slug]` existed — no index page. Added
      `apps/storefront/src/app/[locale]/collections/page.tsx` + `collection.index_*` i18n keys.
      First deploy's Vercel build FAILED (so the route stayed 404): the index is prerendered (SSG),
      its build-time `listCollections()` hit a 404 (API mid-restart — pushing develop also redeploys
      the API since deploy-api.yml has no path filter) and the unhandled throw failed the build.
      Fixed by guarding the fetch with `.catch(() => empty)` like the homepage; ISR (60s) backfills.
      Committed (cfc6082 + 0af92d0) and pushed to develop → Vercel auto-deploys.
      NOTE: storefront deploys via Vercel's native Git integration; the GitHub Actions
      `deploy-storefront.yml` is gated off (`STOREFRONT_DEPLOY_ENABLED` unset) and always skips.
- ✅ Dafani/Elegante images were under-seeded (curated list inherited from the old seed). Corrected:
      dafani now has all 11 folder photos (incl. celva-coll-01..07), elegante all 3
      (incl. robe_elegante_01/02). celva-coll-01/02 serve double duty (dafani product photos AND
      collection heroes) — uploaded as independent R2 objects so product edits don't break the
      collection hero. Re-uploaded + re-seeded preprod (dafani=11, elegante=3 confirmed).
- ✅ Added example placeholders/help text to the main admin create forms (products, categories,
      collections, studio-families, attributes) to guide first-time creation.
- ✅ The "ordre" field now has helper text — new shared `SortOrderInput` with a single shared
      i18n helper ("les plus petits nombres apparaissent en premier…"), applied to all 16 forms.
