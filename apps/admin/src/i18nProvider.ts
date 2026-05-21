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
