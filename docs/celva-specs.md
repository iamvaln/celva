# Celva Store — Spécifications Fonctionnelles v4 (Final)

## Table des matières

1. Vue d'ensemble
2. Rôles et permissions
3. Module Auth & Utilisateurs
4. Module Catalogue
5. Module Approvisionnement
6. Module Production
7. Module Panier & Commandes
8. Module Codes Promo
9. Module TVA & Fiscalité
10. Module Paiements
11. Module Factures / Reçus
12. Module Livraison & Packaging
13. Module Mouvements de stock
14. Module Consignation
15. Module Commissions
16. Module Contenu
17. Module Newsletter
18. Module Finance
19. Module Système
20. Ordre de livraison

---

## 1. Vue d'ensemble

### Stack technique
- **Storefront** : Next.js → celva.store → Vercel
- **Admin** : React-Admin → admin.celva.store → Cloudflare Pages
- **App livreur** : React + Tailwind (PWA) → livraison.celva.store → Cloudflare Pages
- **API** : NestJS + Prisma + PostgreSQL → api.celva.store → Railway
- **Monorepo** : Turborepo avec packages/shared (types, constantes, enums, utils)
- **CI/CD** : GitHub Actions
- **Stockage médias** : Cloudflare R2 + Sharp (transformation d'images côté API)
- **Emails** : Resend ou Brevo

### Domaines
- celva.store → boutique en ligne (proxy API via rewrites Next.js)
- celva.design → réservé (Studio AI, V2)
- admin.celva.store → back-office
- livraison.celva.store → espace livreur
- api.celva.store → API REST

### Paiements supportés
- Orange Money
- MTN Mobile Money
- Cash à la livraison

### Canaux de vente
- Website (celva.store)
- WhatsApp, Facebook, Instagram, TikTok
- En personne

### Architecture multi-app

L'API est conçue pour être consommée par plusieurs clients actuels et futurs. Chaque client transmet un header `X-App-Source` identifiant l'application émettrice (WEB_STORE, WEB_ADMIN, WEB_DELIVERY, MOBILE_STORE, MOBILE_STUDIO, MOBILE_DELIVERY, MOBILE_RESELLER, API). Ce header est enregistré dans l'AuditLog pour tracer quelle application a déclenché chaque événement. L'API est versionée (v1) et documentée via Swagger/OpenAPI.

### Bilingue

Toutes les interfaces sont bilingues FR/EN. Le français est la langue par défaut. Les entités client-facing (Product, Category, Collection, Article, etc.) stockent leurs textes en JSON : `{ "fr": "...", "en": "..." }`. L'API retourne la bonne langue selon le header `Accept-Language`.

---

## 2. Rôles et permissions

### ADMIN
Accès total à toutes les fonctionnalités.

### MANAGER (Gestionnaire)
Gestion catalogue, stocks, commandes, livraisons, approvisionnement, production, consignations, contenu, codes promo, consultation finance. Ne peut pas : gérer les utilisateurs, modifier la config système, supprimer des données financières.

### SALES_REP (Commercial)
Consultation catalogue, création de commandes manuelles (canaux hors site), consultation de ses propres commissions, ventes et consignations. Ne peut pas : modifier le catalogue, accéder à la finance globale, gérer les stocks.

### DELIVERER (Livreur)
Voir ses livraisons assignées, mettre à jour les statuts. Aucun autre accès.

### CLIENT
Parcourir le catalogue, gérer panier et wishlist, passer des commandes, suivre livraisons, gérer profil/adresses/méthodes de paiement, utiliser des codes promo, s'inscrire à la newsletter, télécharger ses reçus, consulter blog et guides.

---

## 3. Module Auth & Utilisateurs

### 3.1 Inscription client
Le client remplit nom, email, téléphone, mot de passe. Validation (email unique, mot de passe min 8 chars, téléphone +237). Compte créé avec rôle CLIENT. Cart vide créé automatiquement. Email de bienvenue envoyé. Mot de passe hashé bcrypt (min 10 rounds).

### 3.2 Connexion
Email + mot de passe → JWT (access 15min + refresh 7j en httpOnly cookie). Rate limiting : 5 tentatives/15min par email. Compte désactivé → refusé.

### 3.3 Mot de passe oublié
Email → lien de réinitialisation (token, expire 1h) → nouveau mot de passe → tous les refresh tokens invalidés.

### 3.4 Gestion des utilisateurs (Admin)
CRUD, filtres par rôle/statut/recherche. Activation/désactivation. Soft delete uniquement. Un Admin ne peut pas se désactiver. Chaque action dans l'AuditLog avec AppSource.

### 3.5 Adresses sauvegardées (Client)
CRUD (label, nom complet, téléphone, ligne 1/2, ville, zone, pays CM par défaut). Flag isDefault (une seule à la fois). Le champ zone matche les DeliveryZone pour calculer les frais.

### 3.6 Méthodes de paiement sauvegardées (Client)
CRUD (type OM/MoMo, label perso, numéro téléphone). Flag isDefault. Numéro validé format camerounais. Affiché partiellement sur le storefront (6XX XXX X89).

---

## 4. Module Catalogue

### 4.1 Catégories
CRUD (nom bilingue, slug auto, description bilingue, sortOrder). Slug unique. Suppression impossible si contient des produits. Catégorie sans produits actifs masquée côté storefront.

### 4.2 Produits
CRUD (nom bilingue, slug, description bilingue, displayPrice TTC, floorPrice TTC, catégorie, type de production, commission par défaut, images, statut). costPrice HT calculé auto ou saisi manuellement (PURCHASED). Duplication possible. displayPrice ≥ floorPrice obligatoire. floorPrice < costPrice → warning. Prix verrouillé dans OrderItem à la commande.

Affichage storefront : produits actifs en stock uniquement. Tri (nouveautés, prix). Filtres dynamiques par attributs, catégorie, prix. Recherche full-text.

### 4.3 Attributs produit (système flexible)
Chaque produit définit ses propres axes de variation. Une robe peut avoir "Taille + Couleur + Hauteur", un sac juste "Couleur". ProductAttribute (nom bilingue, sortOrder, lié au produit) → ProductAttributeValue (valeur bilingue, sortOrder) → VariantAttributeValue (lie variante à une valeur). Un produit peut avoir 1 à N attributs. Deux variantes ne peuvent pas avoir la même combinaison d'attributs (validé côté API). Filtres storefront générés dynamiquement.

### 4.4 Variantes
SKU unique, sélection d'une valeur par attribut, stock, priceOverride TTC optionnel. Génération auto de toutes les combinaisons possible. Vue stock : disponible / consigné / total. Stock modifié uniquement via le StockMovementService.

### 4.5 Images produit
Upload multiple (drag & drop), réordonnable, une isPrimary. Formats : JPEG, PNG, WebP, max 5 Mo. Stockage R2 + Sharp : 4 variantes (original, large 1200px, medium 600px, thumb 300px) en WebP. Clé R2 stockée dans ProductImage.key.

### 4.6 Collections
CRUD (nom bilingue, slug, description bilingue, image couverture, sortOrder, statut). Many-to-many avec Product. Collections thématiques (Noël, Saint-Valentin, Soirées Chic…).

### 4.7 Produits liés (Cross-sell)
Relation directionnelle many-to-many entre produits. Configurable dans l'admin, réordonnable. Maximum recommandé : 4-6 produits liés. Affichage storefront : section "Complétez le look" en bas de fiche produit. Seuls les produits actifs et en stock sont affichés.

---

## 5. Module Approvisionnement

### 5.1 Fournisseurs
CRUD (nom, contact, téléphone, email, adresse). Historique commandes, matières fournies, total dépensé. Suppression impossible si commandes/matières → archivage.

### 5.2 Matières premières
CRUD (nom, type FABRIC/ACCESSORY/PACKAGING/OTHER, unité, prix unitaire, fournisseur, imageKey pour identification visuelle). Stock temps réel. Seuil d'alerte configurable (alertThreshold) → notification admin quand atteint. Stock mis à jour automatiquement via les PurchaseOrders, MaterialConsumptions et PackagingConsumptions.

### 5.3 Commandes fournisseur (PurchaseOrder)
DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED (ou CANCELLED). Lignes (PurchaseOrderItem : matière, quantité, prix unitaire, quantityReceived) + frais annexes (PurchaseOrderCost : TRANSPORT, CUSTOMS, BUYER_COMMISSION, INSURANCE, OTHER). Réception ligne par ligne. Stock incrémenté à réception. Transaction EXPENSE auto-générée. totalAmount recalculé à chaque modification. Commande ORDERED non modifiable (sauf annulation).

---

## 6. Module Production

### 6.1 Ordres de production

**INTERNAL** : ordre créé → étapes définies → matières consommées (stock décrémenté) → laborCost saisi → étapes PENDING → IN_PROGRESS → COMPLETED → stock produit fini incrémenté → costPrice recalculé.

**SUBCONTRACTED** : ordre créé avec sous-traitant et coût → matières optionnellement envoyées → réception → COMPLETED → stock incrémenté → Transaction EXPENSE.

**Calcul costPrice** : INTERNAL = (matières × prix unitaire + laborCost) / quantité. SUBCONTRACTED = (matières × prix unitaire + subcontractCost) / quantité. PURCHASED = saisi manuellement. costPrice toujours HT.

### 6.2 Étapes de production
Définies avec sortOrder. Exécutées dans l'ordre (précédente COMPLETED requise). Date de complétion auto.

---

## 7. Module Panier & Commandes

### 7.1 Panier (storefront)
Ajouter/modifier/supprimer variantes. Quantité incrémentée si déjà présente. Max = stock disponible. Prix = displayPrice ou priceOverride. Persistant côté serveur.

### 7.2 Wishlist (storefront)
Ajouter/supprimer variantes (bouton cœur). Unique par user+variant. Items en rupture conservés. Notification si restock. Ajout au panier direct.

### 7.3 Commandes — flow website
Checkout 3 étapes :
1. Récapitulatif + code promo
2. Livraison : choix mode (HOME_DELIVERY → adresse + frais zone, STORE_PICKUP → point retrait gratuit, RELAY_PICKUP → point relais)
3. Paiement : méthode sauvegardée ou nouvelle

Commande PENDING, orderNumber CLV-YYYYMMDD-XXXX. Stock décrémenté (via StockMovement SALE_OUT). taxRate gelé sur chaque OrderItem. Notification client. deliveryFee calculé : si sous-total ≥ freeDeliveryThreshold → 0 (affiché "Offert" avec prix barré).

### 7.4 Commandes — flow manuel (admin)
Gestionnaire/commercial crée depuis l'admin. Sélection client, variantes, prix unitaire (floorPrice en garde-fou, costPrice en warning rouge). Canal (WHATSAPP, FACEBOOK, etc.). Mode livraison incluant STAFF_DELIVERY. Code promo possible.

### 7.5 Cycle de vie
PENDING → CONFIRMED → PROCESSING → READY → SHIPPED → DELIVERED → COMPLETED. Annulation possible avant SHIPPED (stock restauré via StockMovement CANCELLATION_RETURN, commissions supprimées, usedCount promo décrémenté). READY → DELIVERED direct pour STORE_PICKUP/RELAY_PICKUP. Chaque transition horodatée, notifiée, et dans l'AuditLog.

---

## 8. Module Codes Promo

CRUD admin : code unique (majuscules), type PERCENTAGE/FIXED, valeur, minOrderAmount, maxUses global/par user, dates, statut. Un seul code par commande. Validation au checkout (existe, actif, dates, usages, montant min). Discount ne rend pas le total négatif. Annulation → usedCount décrémenté.

---

## 9. Module TVA & Fiscalité

**Taux** : TVA Cameroun = 19.25% (17.5% TVA + 10% CAC). Stocké dans Settings (TAX_RATE = 0.1925).

**Prix** : tous les prix affichés sont TTC (displayPrice, floorPrice, priceOverride). Le costPrice est HT.

**Gel à la commande** : chaque OrderItem stocke le taxRate en vigueur au moment de la commande. Permet de recalculer HT/TVA même si le taux change.

**Calculs** :
- Prix HT = unitPrice / (1 + taxRate)
- TVA article = unitPrice - prix HT
- Order.taxAmount = somme des TVA de tous les OrderItems

**Affichage** : prix TTC partout sur le storefront. Détail HT + TVA + TTC sur la confirmation et le reçu.

---

## 10. Module Paiements

### Orange Money / MTN MoMo
Méthode sauvegardée ou nouveau numéro → API OM/MoMo → USSD push → callback → Payment COMPLETED → Order CONFIRMED → Transaction INCOME + Invoice générée. FAILED → Order reste PENDING, retry possible.

### Cash à la livraison
Payment PENDING, CASH_ON_DELIVERY. Commande passe en CONFIRMED directement. Livreur collecte. Gestionnaire confirme réception → Payment COMPLETED → Transaction INCOME + Invoice. Limitable par zone et montant max (Settings).

---

## 11. Module Factures / Reçus

### Génération automatique
Quand un Payment passe en COMPLETED → Invoice créée avec numéro séquentiel (CLV-INV-YYYYMM-0001, remise mensuelle). Calcul totalHT, totalTVA, totalTTC depuis les OrderItems et leur taxRate.

### PDF
Généré depuis un template HTML bilingue (langue du client). Stocké sur R2 (pdfKey). Envoyé par email au client.

**Contenu** : en-tête (logo Celva, coordonnées, n° contribuable), infos client, n° facture + date, tableau articles (nom, attributs, qté, prix TTC, total ligne), sous-total, réduction, frais livraison, total HT, total TVA (19.25%), total TTC, mode de paiement + référence, mention légale.

### Fonctionnalités admin
Liste des factures avec filtres. Télécharger PDF. Renvoyer par email. Export CSV pour le comptable.

### Espace client
Le client peut télécharger ses reçus depuis l'historique de commandes.

---

## 12. Module Livraison & Packaging

### 12.1 Zones de livraison (admin)
CRUD (nom bilingue, fee client, actualCost livreur, freeDeliveryThreshold, délai estimé bilingue, statut). Marge livraison = fee - actualCost. Livraison offerte : fee = 0 mais actualCost reste → Celva absorbe.

### 12.2 Points de retrait (admin)
CRUD (nom bilingue, adresse, ville, téléphone, horaires bilingues, statut). Inclut le magasin Celva et les points relais. Affichés au checkout si mode STORE_PICKUP/RELAY_PICKUP.

### 12.3 Modes de livraison

| Mode | Livreur | Frais client | Coût réel |
|------|---------|-------------|-----------|
| HOME_DELIVERY | Livreur externe assigné | Selon zone | Selon zone |
| STAFF_DELIVERY | Responsable interne | Selon zone | Manuel |
| STORE_PICKUP | Aucun | 0 | 0 |
| RELAY_PICKUP | Aucun | Configurable | Configurable |

### 12.4 Suivi livraison
HOME_DELIVERY : assignation → PICKED_UP → IN_TRANSIT → DELIVERED/FAILED. STAFF_DELIVERY : gestionnaire met à jour depuis l'admin. STORE_PICKUP/RELAY_PICKUP : READY → DELIVERED quand client récupère. Client notifié à chaque étape.

### 12.5 App livreur (livraison.celva.store)
Login, liste livraisons (urgence), détail (client, adresse, téléphone, contenu, paiement, montant à collecter si cash), appel client, actions (Récupéré, En route, Livré, Échec + note), historique. 100% mobile, PWA installable.

### 12.6 Packaging
Gestionnaire enregistre les emballages utilisés (RawMaterial type PACKAGING + quantité) → PackagingConsumption. Stock décrémenté. Alerte si sous seuil. Coût = somme (quantité × unitPrice).

### 12.7 Calcul de marge par commande
```
  Prix de vente TTC (somme OrderItems)
- TVA extraite
= Revenu HT
+ Frais de livraison facturés HT
- Coût produit HT (costPrice × quantité)
- Coût packaging HT
- Coût livraison réel
- Commissions
= MARGE NETTE HT
```

---

## 13. Module Mouvements de stock

Chaque modification de stock génère un StockMovement. Le stock ne se modifie JAMAIS directement.

| Type | Sens | Déclencheur |
|------|------|-------------|
| PRODUCTION_IN | + | ProductionOrder COMPLETED |
| PURCHASE_IN | + | Réception produit fini (PURCHASED) |
| SALE_OUT | - | OrderItem confirmé |
| CONSIGNMENT_OUT | - | Consignment créée |
| CONSIGNMENT_RETURN | + | Réconciliation — pièces retournées |
| CANCELLATION_RETURN | + | Commande annulée |
| MANUAL_ADJUSTMENT | +/- | Ajustement admin (raison obligatoire) |

Chaque mouvement : variant, quantity (+/-), type, userId, références source (orderId, productionOrderId, consignmentId). Dashboard admin : historique par variante, par type, par période. Écart physique/système → MANUAL_ADJUSTMENT avec raison.

---

## 14. Module Consignation

### 14.1 Sortie de stock
Gestionnaire crée consignation → commercial + variantes + quantités. Stock disponible décrémenté (StockMovement CONSIGNMENT_OUT), consignedStock incrémenté. Storefront ne voit que le stock disponible.

### 14.2 Réconciliation
Commercial revient → quantitySold + quantityReturned par item. Doit = quantityTaken (sinon écart signalé). Retournés → stock ré-incrémenté (CONSIGNMENT_RETURN). Vendus → commandes créées (IN_PERSON, salesRepId, prix convenu avec garde-fou floorPrice). Commissions calculées. Écart → notes + AuditLog.

### 14.3 Dashboard
Consignations actives, valeur stock consigné, historique, écarts/pertes, alerte si active > X jours (Setting).

---

## 15. Module Commissions

Commission par défaut sur Product (type + valeur). CommissionRule override par commercial par produit (PERCENTAGE sur un, FIXED sur un autre). Calcul auto pour chaque OrderItem d'une commande avec salesRepId : chercher rule → sinon default → calculer → SalesCommission PENDING. Annulation commande → commissions supprimées. Dashboard admin : total dû/payé par commercial, filtres, paiement individuel ou en lot → Transaction EXPENSE / COMMISSION.

---

## 16. Module Contenu

### Articles de blog
CRUD (titre bilingue, slug, contenu bilingue rich text, excerpt bilingue, image couverture, catégorie STYLE/BEHIND_THE_SCENES/EVENTS/GUIDES, publier/dépublier). Storefront : liste, filtres catégorie, article complet, articles liés, SEO.

### Guides de tailles
CRUD par catégorie (nom bilingue, contenu bilingue rich text avec tableaux mensurations incluant hauteur/dimensions). Accessible depuis fiche produit et section documentation.

### Pages statiques (storefront)
Codées dans Next.js, textes dans les fichiers de traduction, pas de CMS :
- /about — À propos / Notre histoire
- /process — Processus créatif
- /faq — Questions fréquentes
- /contact — Formulaire + WhatsApp + localisation
- /terms — CGV
- /privacy — Politique de confidentialité (RGPD)

---

## 17. Module Newsletter

Inscription : formulaire footer (email, nom optionnel), incentive configurable (code promo via Setting), double opt-in. Gestion admin : liste abonnés, filtres, export CSV (pour Brevo). Désabonnement : lien email → isActive = false, soft delete.

---

## 18. Module Finance

### Transactions
Automatiques : paiement COMPLETED → INCOME/SALE, PurchaseOrder RECEIVED → EXPENSE/RAW_MATERIALS, ProductionOrder sous-traitance → EXPENSE/SUBCONTRACTING, commission payée → EXPENSE/COMMISSION. Manuelles : MARKETING, TRANSPORT, CUSTOMS, SALARY, RENT, EQUIPMENT, PACKAGING, DELIVERY, OTHER + justificatif R2.

### Dashboard financier
Vue d'ensemble (CA, dépenses par catégorie, marge brute, courbes). Marge par produit (HT). Analyse par canal (CA, commandes, marge, panier moyen). Analyse livraison (marge/perte, coût livraisons offertes). Commissions (dû/payé, par commercial). Stock (valeur produit fini, consigné, matières, alertes). Factures (total émis, export). Export CSV/Excel pour comptable.

---

## 19. Module Système

### Settings

| Clé | Description | Exemple |
|-----|-------------|---------|
| TAX_RATE | Taux de TVA | 0.1925 |
| MAX_CASH_ON_DELIVERY | Montant max cash | 100000 |
| ORDER_AUTO_COMPLETE_DAYS | Jours avant clôture auto | 7 |
| CONSIGNMENT_ALERT_DAYS | Alerte consignation | 14 |
| NEWSLETTER_PROMO_CODE | Code promo newsletter | WELCOME10 |
| INVOICE_COMPANY_NAME | Raison sociale factures | Celva Design SARL |
| INVOICE_TAX_ID | N° contribuable | CMR... |
| INVOICE_ADDRESS | Adresse factures | Douala, Cameroun |
| CONTACT_EMAIL | Email contact | contact@celva.store |
| CONTACT_PHONE | Téléphone | +237... |
| CONTACT_WHATSAPP | WhatsApp | +237... |
| FREE_DELIVERY_ENABLED | Livraison gratuite | true |
| R2_BUCKET_URL | URL publique R2 | https://media.celva.store |

### Notifications
Client : confirmation, statuts, livraison, restock wishlist, reçu disponible. Admin : nouvelle commande, stock bas, matière alerte, consignation expirée, paiement reçu, échec livraison. Livreur : nouvelle assignation. Commercial : commission payée. Canaux : IN_APP, EMAIL, SMS (V2).

### Audit Log
Chaque entrée : userId, action (CREATE/UPDATE/DELETE/STATUS_CHANGE/LOGIN/LOGIN_FAILED), entity, entityId, appSource (WEB_STORE/WEB_ADMIN/WEB_DELIVERY/MOBILE_*/API), metadata JSON, createdAt. Consultation admin avec filtres, recherche par entityId, export CSV.

---

## 20. Ordre de livraison

### Phase 1 — Fondations
1. Setup monorepo Turborepo + packages/shared
2. Setup NestJS + Prisma + PostgreSQL (migration initiale)
3. Module Auth (inscription, connexion, JWT, refresh, rôles, mot de passe oublié)
4. StockMovementService (service central, point unique de modification du stock)
5. Middleware AuditLog (intercepte actions, enregistre appSource)
6. Setup React-Admin (data provider, auth provider)
7. CRUD utilisateurs (admin)
8. Système de Settings
9. Setup Cloudflare R2 + Sharp
10. Scaffolder storefront Next.js (next-intl FR/EN, Tailwind dark mode, proxy API)
11. Layout storefront (header, footer, navigation)
12. Pages statiques storefront (about, process, FAQ, contact, terms, privacy)
13. CI/CD GitHub Actions (API + Admin + Storefront)

### Phase 2 — Catalogue
14. CRUD catégories
15. CRUD attributs produit (système flexible)
16. CRUD produits + variantes + images R2
17. CRUD collections + association produits
18. Configuration produits liés (cross-sell)
19. Storefront : accueil, boutique (filtres dynamiques, recherche, tri), fiche produit (galerie, attributs, guide tailles, cross-sell), pages collections

### Phase 3 — E-commerce core
20. Adresses et méthodes de paiement sauvegardées
21. Panier + Wishlist
22. Codes promo (CRUD admin + validation storefront)
23. Points de retrait + Zones de livraison
24. Checkout (3 étapes, calcul frais, TVA)
25. Intégration paiements (OM, MoMo, cash)
26. Génération factures (Invoice + PDF + email)
27. Gestion commandes admin (liste, détail, statuts, commande manuelle)
28. Espace client (profil, adresses, paiements, commandes, reçus)
29. Notifications in-app + emails transactionnels

### Phase 4 — Livraison
30. Gestion livraisons admin (assignation, modes, actualCost, suivi)
31. Scaffolding + dev app livreur PWA
32. Suivi livraison côté client
33. Gestion packaging

### Phase 5 — Supply chain & Production
34. CRUD fournisseurs
35. CRUD matières premières (avec image R2, alertes stock)
36. Commandes fournisseur (PurchaseOrder + items + costs + réception)
37. Ordres de production (ProductionOrder + stages + consommation)
38. Calcul automatique costPrice

### Phase 6 — Commerciaux & Finance
39. Module consignation (sortie, réconciliation, dashboard, écarts)
40. Configuration commissions + calcul automatique
41. Dashboard commissions + paiement
42. Dashboard mouvements de stock
43. Module transactions (auto + manuelles + justificatifs)
44. Dashboard financier (CA, dépenses, marges, canaux, livraison, stock, factures)
45. Export comptable (CSV/Excel)

### Phase 7 — Contenu & Lancement
46. CRUD articles blog
47. CRUD guides de tailles
48. Storefront : blog + articles + SEO
49. Module newsletter
50. SEO global (meta, schema.org, sitemap, Open Graph, hreflang)
51. Bouton WhatsApp flottant
52. Tests (cross-browser, mobile, paiements end-to-end)
53. Performance (Lighthouse audit)
54. Soft launch → corrections → lancement public
