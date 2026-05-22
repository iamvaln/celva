import polyglotI18nProvider from 'ra-i18n-polyglot';
import frenchMessages from 'ra-language-french';
import englishMessages from 'ra-language-english';
import { STORAGE_KEYS } from './config';

const celvaFr = {
  celva: {
    title: 'Celva Admin',
    login_subtitle: 'Espace d’administration Celva',
    only_admin_or_manager: 'Seuls les rôles ADMIN et MANAGER peuvent accéder à cet espace.',
    toggle_theme: 'Basculer thème clair / sombre',
    toggle_locale: 'Changer de langue',
  },
  resources: {
    users: {
      name: 'Utilisateur |||| Utilisateurs',
      fields: {
        email: 'Email',
        name: 'Nom',
        phone: 'Téléphone',
        role: 'Rôle',
        isActive: 'Actif',
        createdAt: 'Créé le',
        updatedAt: 'Mis à jour le',
        password: 'Mot de passe',
      },
      actions: {
        activate: 'Activer',
        deactivate: 'Désactiver',
      },
    },
    settings: {
      name: 'Paramètre |||| Paramètres',
      fields: {
        key: 'Clé',
        value: 'Valeur',
        label: 'Libellé bilingue',
      },
    },
    categories: {
      name: 'Catégorie |||| Catégories',
      fields: {
        name: 'Nom (FR / EN)',
        name_fr: 'Nom (FR)',
        name_en: 'Name (EN)',
        slug: 'Slug',
        description_fr: 'Description (FR)',
        description_en: 'Description (EN)',
        sortOrder: 'Ordre',
        createdAt: 'Créé le',
      },
      helpers: {
        slug_optional: 'Optionnel — généré automatiquement depuis le nom français si vide.',
      },
      errors: {
        invalid_slug: 'Slug invalide (lettres minuscules, chiffres et tirets uniquement).',
      },
    },
    attributes: {
      name: 'Attribut |||| Attributs',
      fields: {
        name: 'Nom (FR / EN)',
        name_fr: 'Nom (FR)',
        name_en: 'Name (EN)',
        productId: 'Produit',
        sortOrder: 'Ordre',
      },
      helpers: {
        sort_order_optional: 'Optionnel — attribué automatiquement (0, 1, 2 …) si vide.',
      },
    },
    'attribute-values': {
      name: 'Valeur d’attribut |||| Valeurs d’attribut',
      fields: {
        value: 'Valeur (FR / EN)',
        value_fr: 'Valeur (FR)',
        value_en: 'Value (EN)',
        attributeId: 'Attribut',
        sortOrder: 'Ordre',
      },
      helpers: {
        sort_order_optional: 'Optionnel — attribué automatiquement si vide.',
      },
    },
    variants: {
      name: 'Variante |||| Variantes',
      fields: {
        sku: 'SKU',
        stock: 'Stock disponible',
        consigned: 'Stock consigné',
        priceOverride: 'Prix variante (TTC)',
        isActive: 'Actif',
        productId: 'Produit',
        createdAt: 'Créé le',
      },
      helpers: {
        sku: 'Majuscules / chiffres / . / _ / - ; 2 à 50 caractères. Doit être unique.',
        initial_stock: 'Stock d’ouverture (mouvement MANUAL_ADJUSTMENT enregistré).',
        price_override: 'Optionnel — remplace product.displayPrice pour cette variante.',
        pick_product_first: 'Choisissez d’abord un produit pour afficher ses attributs.',
        product_has_no_attributes:
          'Ce produit n’a pas d’attribut. La variante sera créée sans combinaison.',
        stock_via_adjust:
          'Le stock ne peut pas être modifié directement ici. Utilisez « Ajuster le stock » pour passer par le service de mouvements de stock.',
      },
      actions: {
        adjust_stock: 'Ajuster le stock',
      },
      dialogs: {
        delta: 'Quantité (signée, ex. -5)',
        reason: 'Motif (audit)',
      },
      notifications: {
        stock_adjusted: 'Mouvement de stock enregistré.',
      },
      errors: {
        invalid_sku:
          'SKU invalide (majuscules / chiffres / . / _ / -, 2 à 50 caractères).',
      },
    },
    products: {
      name: 'Produit |||| Produits',
      fields: {
        name: 'Nom (FR / EN)',
        name_fr: 'Nom (FR)',
        name_en: 'Name (EN)',
        slug: 'Slug',
        description_fr: 'Description (FR)',
        description_en: 'Description (EN)',
        displayPrice: 'Prix affiché (TTC)',
        floorPrice: 'Prix plancher (TTC)',
        costPrice: 'Prix de revient (HT)',
        productionType: 'Type de production',
        defaultCommissionType: 'Type de commission',
        defaultCommissionValue: 'Valeur commission',
        isActive: 'Actif',
        categoryId: 'Catégorie',
        createdAt: 'Créé le',
      },
      helpers: {
        slug_optional: 'Optionnel — généré automatiquement depuis le nom français si vide.',
        cost_price: 'Saisi manuellement pour PURCHASED. Auto-calculé pour INTERNAL / SUBCONTRACTED dès qu’un ordre de production est complété.',
      },
      actions: {
        duplicate: 'Dupliquer',
      },
      notifications: {
        duplicated: 'Produit dupliqué. Pensez à le réactiver une fois revu.',
      },
      errors: {
        invalid_slug: 'Slug invalide (lettres minuscules, chiffres et tirets uniquement).',
      },
      images: {
        title: 'Images',
        upload: 'Ajouter une image',
        uploading: 'Téléversement…',
        uploaded: 'Image téléversée. Variantes WebP générées.',
        make_primary: 'Définir comme image principale',
        confirm_delete: 'Supprimer cette image ?',
        empty: 'Aucune image. Ajoutez-en une pour démarrer.',
      },
      related: {
        title: 'Produits liés (cross-sell)',
        helper: 'Maximum 6. Affichés en bas de la fiche produit dans « Complétez le look ».',
        add_label: 'Ajouter un produit',
        add: 'Ajouter',
        empty: 'Aucun produit lié.',
        cap_reached: 'Limite atteinte (6). Retirez-en un pour en ajouter un autre.',
      },
    },
    collections: {
      name: 'Collection |||| Collections',
      fields: {
        name: 'Nom (FR / EN)',
        name_fr: 'Nom (FR)',
        name_en: 'Name (EN)',
        slug: 'Slug',
        description_fr: 'Description (FR)',
        description_en: 'Description (EN)',
        imageUrl: 'Image (URL)',
        sortOrder: 'Ordre',
        isActive: 'Active',
        createdAt: 'Créée le',
      },
      helpers: {
        slug_optional: 'Optionnel — généré automatiquement depuis le nom français si vide.',
      },
      errors: {
        invalid_slug: 'Slug invalide (lettres minuscules, chiffres et tirets uniquement).',
      },
      products: {
        title: 'Produits de la collection',
        add_label: 'Ajouter un produit',
        add: 'Ajouter',
        empty: 'Aucun produit. Ajoutez-en un pour démarrer.',
      },
    },
    'promo-codes': {
      name: 'Code promo |||| Codes promo',
      fields: {
        code: 'Code',
        type: 'Type',
        value: 'Valeur',
        minOrderAmount: 'Montant min. de commande',
        maxUses: 'Usages max. (global)',
        maxUsesPerUser: 'Usages max. par client',
        usedCount: 'Utilisations',
        isActive: 'Actif',
        startsAt: 'Démarre le',
        expiresAt: 'Expire le',
      },
      helpers: {
        code_format: 'Majuscules / chiffres / _ / -, 2 à 32 caractères. Verrouillé après création.',
        value: 'POURCENTAGE : 1-100. FIXE : montant en XAF.',
      },
      errors: {
        invalid_format: 'Format invalide (majuscules / chiffres / _ / -).',
      },
    },
    'delivery-zones': {
      name: 'Zone de livraison |||| Zones de livraison',
      fields: {
        name: 'Nom (FR / EN)',
        name_fr: 'Nom (FR)',
        name_en: 'Name (EN)',
        fee: 'Frais (XAF)',
        actualCost: 'Coût réel (XAF, interne)',
        freeDeliveryThreshold: 'Seuil livraison gratuite',
        estimatedDays: 'Délai estimé',
        isActive: 'Active',
      },
      helpers: {
        fee: 'Affiché au client. TTC, XAF.',
        actual_cost: 'Coût payé au coursier. JAMAIS exposé au storefront — utilisé pour le calcul de marge.',
        free_threshold: 'Sous-total à partir duquel la livraison est offerte (si FREE_DELIVERY_ENABLED actif).',
      },
    },
    'pickup-points': {
      name: 'Point de retrait |||| Points de retrait',
      fields: {
        name: 'Nom (FR / EN)',
        name_fr: 'Nom (FR)',
        name_en: 'Name (EN)',
        address: 'Adresse',
        city: 'Ville',
        phone: 'Téléphone',
        hours_fr: 'Horaires (FR)',
        hours_en: 'Hours (EN)',
        isActive: 'Actif',
      },
      helpers: {
        phone: 'Numéro Cameroun (+237…). Optionnel.',
      },
    },
    orders: {
      name: 'Commande |||| Commandes',
      fields: {
        orderNumber: 'N° commande',
        client: 'Client',
        status: 'Statut',
        channel: 'Canal',
        total: 'Total',
        payment: 'Paiement',
        items: 'Articles',
        delivery: 'Livraison',
        totals: 'Totaux',
        notes: 'Notes',
        createdAt: 'Créée le',
        updatedAt: 'Mise à jour le',
      },
      actions: {
        transition: 'Faire avancer',
        cancel: 'Annuler la commande',
        download_invoice: 'Télécharger la facture',
      },
      dialogs: {
        current_status: 'Statut actuel',
        pick_next: 'Choisir le prochain statut…',
        reason: 'Motif (optionnel, journalisé)',
        cancel_warning:
          'L\'annulation restocke les articles et décrémente le code promo. Action irréversible.',
      },
      notifications: {
        transitioned: 'Statut mis à jour.',
        cancelled: 'Commande annulée. Stock restauré.',
        invoice_failed: 'Impossible de télécharger la facture. La commande a-t-elle été payée ?',
      },
    },
  },
};

const celvaEn = {
  celva: {
    title: 'Celva Admin',
    login_subtitle: 'Celva administration console',
    only_admin_or_manager: 'Only ADMIN and MANAGER roles may sign in here.',
    toggle_theme: 'Toggle light / dark theme',
    toggle_locale: 'Switch language',
  },
  resources: {
    users: {
      name: 'User |||| Users',
      fields: {
        email: 'Email',
        name: 'Name',
        phone: 'Phone',
        role: 'Role',
        isActive: 'Active',
        createdAt: 'Created at',
        updatedAt: 'Updated at',
        password: 'Password',
      },
      actions: {
        activate: 'Activate',
        deactivate: 'Deactivate',
      },
    },
    settings: {
      name: 'Setting |||| Settings',
      fields: {
        key: 'Key',
        value: 'Value',
        label: 'Bilingual label',
      },
    },
    categories: {
      name: 'Category |||| Categories',
      fields: {
        name: 'Name (FR / EN)',
        name_fr: 'Name (FR)',
        name_en: 'Name (EN)',
        slug: 'Slug',
        description_fr: 'Description (FR)',
        description_en: 'Description (EN)',
        sortOrder: 'Order',
        createdAt: 'Created at',
      },
      helpers: {
        slug_optional: 'Optional — auto-generated from the French name if blank.',
      },
      errors: {
        invalid_slug: 'Invalid slug (lowercase letters, digits and dashes only).',
      },
    },
    attributes: {
      name: 'Attribute |||| Attributes',
      fields: {
        name: 'Name (FR / EN)',
        name_fr: 'Name (FR)',
        name_en: 'Name (EN)',
        productId: 'Product',
        sortOrder: 'Order',
      },
      helpers: {
        sort_order_optional: 'Optional — auto-assigned (0, 1, 2 …) if blank.',
      },
    },
    'attribute-values': {
      name: 'Attribute value |||| Attribute values',
      fields: {
        value: 'Value (FR / EN)',
        value_fr: 'Value (FR)',
        value_en: 'Value (EN)',
        attributeId: 'Attribute',
        sortOrder: 'Order',
      },
      helpers: {
        sort_order_optional: 'Optional — auto-assigned if blank.',
      },
    },
    variants: {
      name: 'Variant |||| Variants',
      fields: {
        sku: 'SKU',
        stock: 'Available stock',
        consigned: 'Consigned stock',
        priceOverride: 'Variant price (incl. VAT)',
        isActive: 'Active',
        productId: 'Product',
        createdAt: 'Created at',
      },
      helpers: {
        sku: 'A-Z / 0-9 / . / _ / -, 2 to 50 chars. Must be unique.',
        initial_stock: 'Opening stock (MANUAL_ADJUSTMENT movement recorded).',
        price_override: 'Optional — overrides product.displayPrice for this variant.',
        pick_product_first: 'Pick a product first to load its attributes.',
        product_has_no_attributes:
          'This product has no attributes. Variant will be created with no combination.',
        stock_via_adjust:
          'Stock cannot be set directly here. Use “Adjust stock” to go through the stock-movements service.',
      },
      actions: {
        adjust_stock: 'Adjust stock',
      },
      dialogs: {
        delta: 'Signed quantity (e.g. -5)',
        reason: 'Audit reason',
      },
      notifications: {
        stock_adjusted: 'Stock movement recorded.',
      },
      errors: {
        invalid_sku: 'Invalid SKU (uppercase / digits / . / _ / -, 2 to 50 chars).',
      },
    },
    products: {
      name: 'Product |||| Products',
      fields: {
        name: 'Name (FR / EN)',
        name_fr: 'Name (FR)',
        name_en: 'Name (EN)',
        slug: 'Slug',
        description_fr: 'Description (FR)',
        description_en: 'Description (EN)',
        displayPrice: 'Display price (incl. VAT)',
        floorPrice: 'Floor price (incl. VAT)',
        costPrice: 'Cost price (excl. VAT)',
        productionType: 'Production type',
        defaultCommissionType: 'Commission type',
        defaultCommissionValue: 'Commission value',
        isActive: 'Active',
        categoryId: 'Category',
        createdAt: 'Created at',
      },
      helpers: {
        slug_optional: 'Optional — auto-generated from the French name if blank.',
        cost_price: 'Entered manually for PURCHASED. Auto-computed for INTERNAL / SUBCONTRACTED once a production order completes.',
      },
      actions: {
        duplicate: 'Duplicate',
      },
      notifications: {
        duplicated: 'Product duplicated. Remember to reactivate once reviewed.',
      },
      errors: {
        invalid_slug: 'Invalid slug (lowercase letters, digits and dashes only).',
      },
      images: {
        title: 'Images',
        upload: 'Add image',
        uploading: 'Uploading…',
        uploaded: 'Image uploaded. WebP variants generated.',
        make_primary: 'Set as primary image',
        confirm_delete: 'Delete this image?',
        empty: 'No images yet. Add one to get started.',
      },
    },
    'promo-codes': {
      name: 'Promo code |||| Promo codes',
      fields: {
        code: 'Code',
        type: 'Type',
        value: 'Value',
        minOrderAmount: 'Min. order amount',
        maxUses: 'Max. uses (global)',
        maxUsesPerUser: 'Max. uses per customer',
        usedCount: 'Used',
        isActive: 'Active',
        startsAt: 'Starts at',
        expiresAt: 'Expires at',
      },
      helpers: {
        code_format: 'Uppercase / digits / _ / -, 2 to 32 chars. Locked after creation.',
        value: 'PERCENTAGE: 1-100. FIXED: XAF amount.',
      },
      errors: {
        invalid_format: 'Invalid format (uppercase / digits / _ / -).',
      },
    },
    'delivery-zones': {
      name: 'Delivery zone |||| Delivery zones',
      fields: {
        name: 'Name (FR / EN)',
        name_fr: 'Name (FR)',
        name_en: 'Name (EN)',
        fee: 'Fee (XAF)',
        actualCost: 'Actual cost (XAF, internal)',
        freeDeliveryThreshold: 'Free delivery threshold',
        estimatedDays: 'Estimated days',
        isActive: 'Active',
      },
      helpers: {
        fee: 'Shown to the customer. VAT included, XAF.',
        actual_cost: 'What the courier charges. NEVER exposed to the storefront — used for margin reporting.',
        free_threshold: 'Subtotal at which delivery is free (when FREE_DELIVERY_ENABLED is on).',
      },
    },
    'pickup-points': {
      name: 'Pickup point |||| Pickup points',
      fields: {
        name: 'Name (FR / EN)',
        name_fr: 'Name (FR)',
        name_en: 'Name (EN)',
        address: 'Address',
        city: 'City',
        phone: 'Phone',
        hours_fr: 'Hours (FR)',
        hours_en: 'Hours (EN)',
        isActive: 'Active',
      },
      helpers: {
        phone: 'Cameroon phone (+237…). Optional.',
      },
    },
    orders: {
      name: 'Order |||| Orders',
      fields: {
        orderNumber: 'Order #',
        client: 'Customer',
        status: 'Status',
        channel: 'Channel',
        total: 'Total',
        payment: 'Payment',
        items: 'Items',
        delivery: 'Delivery',
        totals: 'Totals',
        notes: 'Notes',
        createdAt: 'Created at',
        updatedAt: 'Updated at',
      },
      actions: {
        transition: 'Advance status',
        cancel: 'Cancel order',
        download_invoice: 'Download invoice',
      },
      dialogs: {
        current_status: 'Current status',
        pick_next: 'Pick next status…',
        reason: 'Reason (optional, audited)',
        cancel_warning:
          'Cancelling restocks the items and decrements the promo code. This cannot be undone.',
      },
      notifications: {
        transitioned: 'Status updated.',
        cancelled: 'Order cancelled. Stock restored.',
        invoice_failed: "Couldn't download the invoice. Has the order been paid yet?",
      },
    },
  },
};

const messages = {
  fr: { ...frenchMessages, ...celvaFr },
  en: { ...englishMessages, ...celvaEn },
};

const initialLocale = (): 'fr' | 'en' => {
  if (typeof window === 'undefined') return 'fr';
  const stored = window.localStorage.getItem(STORAGE_KEYS.locale);
  return stored === 'en' ? 'en' : 'fr';
};

export const i18nProvider = polyglotI18nProvider(
  (locale) => messages[locale as 'fr' | 'en'] ?? messages.fr,
  initialLocale(),
  [
    { locale: 'fr', name: 'Français' },
    { locale: 'en', name: 'English' },
  ],
);
