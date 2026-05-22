# Celva Store — Brief Visuel Storefront

## 1. Identité de marque (source : Brand Book Celva v01, 2026)

### Logo
- **Monogramme** C+V : utilisable seul comme favicon, icône app, et watermark
- **Horizontal** : monogramme + CELVA — pour le header du site
- **Vertical** : monogramme au-dessus de CELVA — pour le footer, pages d'auth
- **Motif** : pattern répétitif du monogramme — utilisable en fond subtil sur les sections d'accroche, le packaging virtuel, les emails

### Palette de couleurs

| Rôle | Nom | Hex | Utilisation web |
|------|-----|-----|-----------------|
| Principale | Terracotta | #B26248 | CTAs, liens actifs, accents, prix, badges promo |
| Secondaire | Beige | #E8D9C6 | Fond de page (light mode), cartes, sections alternées |
| Tertiaire | Olive | #595D40 | Titres, texte principal, icônes, footer |
| Neutre clair | Blanc cassé | #FAF7F2 | Fond principal light mode (plus chaud que du blanc pur) |
| Neutre foncé | Noir doux | #1A1A18 | Fond principal dark mode, texte sur fond clair |
| Gris chaud | — | #8C8680 | Texte secondaire, placeholders, bordures subtiles |

**Règle clé** : NE JAMAIS utiliser du blanc pur (#FFFFFF) ni du noir pur (#000000). Toute la palette est chaude. Le blanc cassé #FAF7F2 et le noir doux #1A1A18 gardent la cohérence terre/organique de la marque.

### Typographie web

| Rôle | Font | Famille | Poids | Utilisation |
|------|------|---------|-------|-------------|
| Titres | Bodoni Moda | Serif haute-contraste | Regular 400, Bold 700, Italic 400i | H1, H2, nom de produit, prix, nom de collection |
| Corps | Cormorant Garamond | Serif organique | Light 300, Regular 400, Medium 500, SemiBold 600, Italic | Paragraphes, descriptions, boutons, navigation, labels |

**Bodoni Moda** remplace Didot (licence libre, Google Fonts). Même ADN haute couture : contrastes forts, empattements fins, élégance immédiate.

**Cormorant Garamond** remplace Canela (licence libre, Google Fonts). Même chaleur organique, courbes douces, lisibilité excellente en corps de texte.

**Sizing** :
- H1 : 48px desktop / 32px mobile (Bodoni Moda Bold)
- H2 : 36px desktop / 24px mobile (Bodoni Moda Regular)
- H3 : 24px desktop / 20px mobile (Bodoni Moda Regular)
- Body : 16px (Cormorant Garamond Regular)
- Small : 14px (Cormorant Garamond Regular)
- Caption : 12px (Cormorant Garamond Medium, uppercase, letter-spacing 0.1em)

**Les fonts sont auto-hébergées** via next/font/local. Pas de Google Fonts CDN. Subset pour les caractères FR/EN uniquement.

---

## 2. Direction artistique

### Ambiance générale
Le site est un écrin minimaliste. Le vêtement est le sujet, le design est invisible. Beaucoup de respiration (whitespace), des lignes épurées, aucun élément décoratif superflu. Chaque pixel justifie sa présence.

**Références** : Arket, COS, Totême, The Row, OMÔL (Cameroun)

### Principes de design

**Respiration** — les marges sont généreuses. Entre chaque section, au moins 80px desktop / 48px mobile. Le contenu ne touche jamais les bords de l'écran (padding horizontal min 24px mobile, 48px tablette, 80-120px desktop).

**Hiérarchie** — une seule chose attire l'attention à la fois. Sur la fiche produit, c'est l'image. Sur le catalogue, c'est la grille. Les CTAs sont les seuls éléments avec du poids visuel (fond terracotta).

**Neutralité active** — le fond n'est pas "vide", il est choisi. Alterner entre blanc cassé (#FAF7F2) et beige (#E8D9C6) pour créer du rythme sans couleur.

**Textures** — utiliser le motif monogramme très subtilement (opacité 3-5%) en fond de certaines sections hero pour ajouter de la richesse sans casser le minimalisme.

---

## 3. Design System — Tokens Tailwind

### Couleurs
```javascript
colors: {
  celva: {
    terracotta: '#B26248',
    'terracotta-light': '#C4836B',   // hover states
    'terracotta-dark': '#8E4E3A',    // active states
    beige: '#E8D9C6',
    'beige-light': '#F0E8DA',
    'beige-dark': '#D4C4AE',
    olive: '#595D40',
    'olive-light': '#6E7354',
    'olive-dark': '#3F422D',
    cream: '#FAF7F2',                // fond principal light
    dark: '#1A1A18',                 // fond principal dark
    'dark-surface': '#262622',       // cartes en dark mode
    'dark-border': '#3A3A35',
    gray: '#8C8680',
    'gray-light': '#B5B0A9',
    'gray-dark': '#5C5955',
  }
}
```

### Dark mode

| Élément | Light mode | Dark mode |
|---------|-----------|-----------|
| Fond principal | cream #FAF7F2 | dark #1A1A18 |
| Fond cartes/surfaces | beige #E8D9C6 | dark-surface #262622 |
| Texte principal | olive #595D40 | cream #FAF7F2 |
| Texte secondaire | gray #8C8680 | gray-light #B5B0A9 |
| Bordures | beige-dark #D4C4AE | dark-border #3A3A35 |
| CTA principal | terracotta #B26248 | terracotta #B26248 (inchangé) |
| CTA texte | cream #FAF7F2 | cream #FAF7F2 |
| Liens | terracotta #B26248 | terracotta-light #C4836B |
| Header/Footer fond | cream #FAF7F2 | dark #1A1A18 |
| Logo | olive (sur clair) | cream (sur sombre) |

Le terracotta reste la couleur d'accent dans les deux modes — c'est l'ancre de la marque.

### Composants de base

**Bouton primaire** : fond terracotta, texte cream, border-radius 0px (angles droits = plus chic), padding 16px 32px, uppercase Cormorant Garamond Medium, letter-spacing 0.1em. Hover : terracotta-dark. Transition 200ms ease.

**Bouton secondaire** : fond transparent, bordure 1px olive (light) ou cream (dark), texte olive/cream. Hover : fond olive/cream à 10% d'opacité.

**Input** : bordure bottom 1px gray, pas de bordure complète (style underline minimaliste). Focus : bordure bottom terracotta. Label au-dessus, Cormorant Garamond Regular 14px, couleur gray.

**Cards produit** : pas de bordure, pas d'ombre. Image plein cadre avec ratio 3:4 (portrait mode). En dessous : nom (Bodoni Moda Regular), prix (Bodoni Moda Regular, terracotta). Hover : légère élévation (translateY -4px) + ombre subtile (0 8px 24px rgba(0,0,0,0.06)), transition 300ms ease-out.

**Badge** : petit tag terracotta avec texte cream, uppercase, 10px, pour "Nouveau", "Promo", "-20%".

**Séparateurs** : ligne fine 1px, couleur beige-dark (light) ou dark-border (dark). Utilisés avec parcimonie.

---

## 4. Layout par page

### 4.1 Header (sticky)
- Fond cream/dark (transparent au scroll top, fond solide après 50px de scroll)
- Gauche : logo horizontal (monogramme + CELVA)
- Centre : navigation principale (Boutique, Collections, Studio, Journal)
- Droite : icônes (recherche, compte, wishlist cœur, panier avec badge)
- Sur mobile : logo centré, burger menu à gauche, panier à droite
- Barre d'annonce au-dessus du header (texte défilant : "Livraison offerte dès 50 000 FCFA")
- Navigation Cormorant Garamond Medium, uppercase, letter-spacing 0.08em, 13px

### 4.2 Accueil
**Hero** — image plein écran (100vh) d'un modèle portant Celva, avec le titre en Bodoni Moda Bold superposé en blanc/cream. CTA "Découvrir la collection" en bouton primaire. L'image a un léger overlay gradient en bas pour la lisibilité du texte. Sur mobile, l'image est recadrée en portrait.

**Sélection vedette** — titre "Nos pièces phares" en Bodoni Moda. Grille 4 colonnes desktop / 2 mobile de produits. Hover : deuxième image en fondu.

**Bannière sur-mesure** — section plein largeur, fond beige avec motif monogramme subtil (3% opacité). Titre "Créez votre pièce" + texte court + CTA vers /studio (ou placeholder V2). Image d'un tissu ou d'un atelier à droite.

**Collections** — 2-3 collections mises en avant. Image grande format + nom en overlay. Lien vers la page collection.

**Témoignages** — fond olive, texte cream. Carousel de 3-5 avis. Citation en Bodoni Moda Italic, nom en Cormorant.

**Newsletter** — section simple, fond beige. "Rejoignez l'univers Celva" + champ email + bouton. Mention de l'incentive (-10%).

**Footer** — fond olive dark, texte cream. Logo vertical centré en haut. 4 colonnes : Boutique (liens), À propos (liens), Aide (liens), Contact (email, tél, WhatsApp, réseaux sociaux). Copyright en bas. Modes de paiement (icônes OM, MoMo). Sélecteur langue FR/EN.

### 4.3 Boutique (/shop)
- Header de page : titre "Boutique" en Bodoni Moda, optionnel sous-titre
- Barre de filtres horizontale (sticky sous le header) : catégorie, taille, couleur, prix, tri. Style : pills/tags sélectionnables, fond transparent, bordure fine. Filtres actifs en fond olive texte cream.
- Grille produits : 4 colonnes desktop, 3 tablette, 2 mobile
- Cards : image ratio 3:4, hover avec deuxième image en fondu (crossfade 400ms). Nom + prix en dessous. Si promo : ancien prix barré en gray, nouveau prix en terracotta.
- Pagination : "Charger plus" (bouton secondaire) plutôt qu'un pagination numérique

### 4.4 Fiche produit (/shop/[slug])
**Layout desktop** : 60/40 split. Gauche : galerie d'images (scroll vertical, images empilées, ou grille 2 colonnes). Droite : infos produit en sticky.

**Layout mobile** : galerie en carousel horizontal (swipe), puis infos en dessous.

**Galerie** : images plein cadre, pas de bordure. Zoom au clic (lightbox). Thumbnails en bas ou navigation par dots sur mobile.

**Infos produit** :
- Nom (Bodoni Moda Bold, H1)
- Prix (Bodoni Moda Regular, terracotta, 24px)
- Description courte (Cormorant, 16px)
- Sélecteurs d'attributs :
  - Couleurs : swatches ronds (cercles de couleur, 32px, bordure 2px terracotta quand sélectionné)
  - Tailles : boutons pill rectangulaires (bordure fine, fond olive quand sélectionné, grisé si rupture)
  - Hauteur/autres : dropdown ou pills selon le nombre de valeurs
- Lien "Guide des tailles" → ouvre une modale
- Bouton "Ajouter au panier" : plein largeur, bouton primaire, sticky en bas sur mobile
- Bouton wishlist (icône cœur) à côté du CTA
- Accordéons : Description complète, Composition & entretien, Livraison & retours

**Section cross-sell** : "Complétez le look" — grille horizontale scrollable de 4-6 produits liés.

### 4.5 Collection (/collections/[slug])
- Hero : image de couverture plein largeur (ratio 21:9 desktop, 16:9 mobile) avec nom de la collection en overlay (Bodoni Moda Bold, grand)
- Description courte en dessous
- Grille produits (même style que la boutique)

### 4.6 Panier (/cart)
- Liste des articles avec image (petit format), nom, attributs, prix, sélecteur quantité, bouton supprimer
- Sous-total à droite (desktop) ou en bas sticky (mobile)
- Champ code promo (input minimaliste avec bouton "Appliquer")
- CTA "Passer commande" (bouton primaire plein largeur)
- Section "Vous pourriez aussi aimer" en dessous

### 4.7 Checkout (/checkout)
- Design épuré, pas de header navigation complet (juste le logo centré + lien retour boutique)
- Stepper visuel en haut : 3 étapes (Récapitulatif → Livraison → Paiement), étape active en terracotta
- Chaque étape est un formulaire propre, une chose à la fois
- Récapitulatif de commande à droite (desktop) ou en accordéon en haut (mobile)
- Bouton continuer : primaire, plein largeur sur mobile

### 4.8 Espace client (/account)
- Navigation latérale (desktop) ou tabs en haut (mobile)
- Sections : Commandes, Wishlist, Adresses, Méthodes de paiement, Profil
- Design sobre, fonctionnel. Pas de fioritures.

### 4.9 Blog (/journal)
- Grille d'articles : image couverture ratio 16:9, titre en Bodoni Moda, excerpt en Cormorant, date
- 3 colonnes desktop, 1 mobile
- Page article : hero image plein largeur, titre centré (Bodoni Moda Bold), contenu en colonne étroite centrée (max 720px), lisibilité maximale

### 4.10 Pages statiques
- Layout simple : contenu centré, max 800px de large
- Titres en Bodoni Moda, corps en Cormorant
- Pour la page "Notre processus" : timeline visuelle horizontale (desktop) ou verticale (mobile) avec les étapes illustrées
- FAQ : accordéon sobre, icône + en olive, rotation au clic

---

## 5. Animations

### Principes
- Tout est subtil. Si l'utilisateur remarque l'animation, c'est qu'elle est trop forte.
- Durée standard : 200-300ms pour les micro-interactions, 400-600ms pour les transitions de contenu
- Easing : ease-out pour les apparitions, ease-in-out pour les transitions
- Pas de parallax. Pas d'animations au scroll agressives.

### Micro-interactions
| Élément | Animation | Durée |
|---------|-----------|-------|
| Bouton hover | Scale 1.02 + changement couleur fond | 200ms |
| Card produit hover | TranslateY -4px + ombre | 300ms ease-out |
| Image produit hover | Crossfade vers deuxième image | 400ms |
| Ajout panier | Badge panier pulse + scale | 300ms |
| Like wishlist | Icône cœur fill animation | 300ms |
| Menu mobile | Slide-in depuis la gauche | 300ms ease-out |
| Modale | Fade-in + scale de 0.95 à 1 | 200ms |
| Accordéon | Height auto avec transition | 300ms ease-in-out |
| Notification toast | Slide-in depuis le haut + fade | 300ms, auto-dismiss 4s |

### Transitions de page
- Fade-in du contenu principal au chargement : opacité 0→1, translateY 8px→0, durée 400ms
- Les images se chargent avec un fade-in individuel (pas de placeholder gris brutal)
- Utiliser Framer Motion pour les transitions entre pages (optionnel, évaluer l'impact bundle)

### Scroll
- Les sections apparaissent au scroll avec un léger fade-in + translateY (intersection observer)
- Pas de stagger complexe — une section = une animation
- Le header change d'opacité de fond au scroll (transparent → solide)

---

## 6. Direction photographique

### Photos produit (fond neutre)
- Fond beige #E8D9C6 ou blanc cassé #FAF7F2 — pas de blanc pur
- Éclairage doux et naturel, pas de flash direct
- Le vêtement est porté (pas de flat lay pour les photos principales)
- Minimum 4 photos par produit : face, dos, détail tissu, porté en situation
- Ratio 3:4 (portrait) pour toutes les photos produit

### Photos lifestyle
- Lumière naturelle, décors épurés (murs neutres, végétation, architecture minimaliste)
- Les modèles sont naturels, pas de poses forcées
- Palette de l'environnement cohérente avec la marque (tons chauds, terreux)
- Utilisées pour : hero accueil, bannières collections, sections storytelling

### Direction commune
- Post-production minimaliste : pas de filtres lourds, pas de saturation exagérée
- Tons légèrement chauds, cohérents avec la palette terracotta/beige/olive
- Peau naturelle (pas de retouche lissante excessive)

---

## 7. Éléments spéciaux

### Bouton WhatsApp flottant
- Position : bas droite, 24px du bord
- Cercle 56px, fond vert WhatsApp (#25D366), icône blanche
- Léger shadow. Pulse subtil au premier chargement pour attirer l'attention.
- Disparaît au scroll vers le bas, réapparaît au scroll vers le haut (même comportement que le FAB Material)

### Toast notifications
- Apparaissent en haut centre
- Fond olive, texte cream, icône à gauche
- Auto-dismiss après 4 secondes
- "Ajouté au panier ✓", "Article ajouté à la wishlist", etc.

### Loading states
- Skeleton screens (pas de spinners) avec animation pulse en beige-light/beige
- Les images ont un fond beige comme placeholder pendant le chargement

### Empty states
- Illustrations minimalistes (line art) en olive
- Texte encourageant + CTA
- Panier vide : "Votre panier est vide" + "Découvrir la boutique"
- Wishlist vide : "Pas encore de coups de cœur" + "Explorer"

### Page 404
- Grande typographie Bodoni Moda "404"
- Message court + CTA retour accueil
- Simple, élégant, pas de gif ou d'illustration complexe

---

## 8. Responsive breakpoints

### Mobile (< 640px)
- Navigation : burger + logo centré + panier
- Grilles produits : 2 colonnes
- Fiche produit : galerie carousel + infos en dessous + CTA sticky bottom
- Checkout : tout en colonne, récapitulatif en accordéon
- Touch targets minimum 44px × 44px

### Tablette (640-1024px)
- Navigation : similaire desktop mais plus compacte
- Grilles : 3 colonnes
- Fiche produit : galerie réduite + infos à droite (layout similaire desktop)

### Desktop (> 1024px)
- Navigation complète
- Grilles : 4 colonnes
- Fiche produit : 60/40 split
- Max-width du contenu : 1440px, centré

---

## 9. Références visuelles

### Sites à étudier
- **Arket** (arket.com) — le benchmark principal. Sobriété, whitespace, produit au centre. Observer leur grille catalogue, fiche produit, et checkout.
- **COS** (cos.com) — même famille H&M Group. Navigation, hero, typographie.
- **Totême** (toteme-studio.com) — minimalisme poussé, peu de couleur, images grandes.
- **The Frankie Shop** (thefrankieshop.com) — e-commerce minimaliste indépendant, bonne référence technique.
- **OMÔL** (omol-cm.com) — marque camerounaise, minimalisme afro-contemporain.

### Ce qu'on prend de chaque
- D'Arket : la structure, le calme, le whitespace
- De COS : les transitions subtiles, la grille produit
- De Totême : le ratio typographie/image, la taille des visuels
- D'OMÔL : la preuve qu'une marque camerounaise peut faire du minimalisme premium

### Ce qu'on ne fait PAS
- Pas de popups agressifs (le seul popup est le bandeau cookies RGPD)
- Pas de sliders rotatifs automatiques
- Pas de fond noir (sauf dark mode)
- Pas d'effets "wow" qui ralentissent le site
- Pas de texte sur image sans overlay de lisibilité
- Pas de stock photos génériques
