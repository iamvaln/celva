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
