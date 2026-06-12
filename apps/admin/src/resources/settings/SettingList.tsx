import type { ComponentType } from 'react';
import { Title, useGetList, useLocaleState, useRedirect, useTranslate } from 'react-admin';
import type { SvgIconProps } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PhoneIcon from '@mui/icons-material/Phone';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TuneIcon from '@mui/icons-material/Tune';
import SettingsIcon from '@mui/icons-material/Settings';
import type { Setting } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import './settings.css';

type GroupId = 'tax' | 'contact' | 'delivery' | 'orders' | 'store' | 'other';

type GroupDef = {
  id: GroupId;
  icon: ComponentType<SvgIconProps>;
  /** substrings matched (case-insensitive) against the setting key */
  match: string[];
};

// Best-effort mapping of setting keys to labelled sections. `other` is the
// catch-all and never carries match terms — it collects anything unmatched.
const GROUPS: GroupDef[] = [
  { id: 'tax', icon: ReceiptLongIcon, match: ['tax', 'vat', 'tva', 'invoice', 'factur', 'fiscal', 'legal', 'siret'] },
  { id: 'contact', icon: PhoneIcon, match: ['contact', 'email', 'mail', 'phone', 'tel', 'whatsapp', 'address', 'adresse'] },
  { id: 'delivery', icon: LocalShippingIcon, match: ['deliver', 'livraison', 'shipping', 'ship', 'pickup', 'freight'] },
  { id: 'orders', icon: ShoppingBagIcon, match: ['order', 'commande', 'promo', 'discount', 'newsletter', 'commission', 'consign'] },
  { id: 'store', icon: StorefrontIcon, match: ['store', 'shop', 'boutique', 'currency', 'devise', 'locale', 'lang', 'name', 'brand'] },
  { id: 'other', icon: TuneIcon, match: [] },
];

const groupOf = (key: string): GroupId => {
  const k = key.toLowerCase();
  for (const g of GROUPS) {
    if (g.match.some((m) => k.includes(m))) return g.id;
  }
  return 'other';
};

const settingLabel = (s: Setting, locale: 'fr' | 'en'): string => {
  const l = s.label;
  return l?.[locale] || l?.fr || l?.en || s.key;
};

export const SettingList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const [localeState] = useLocaleState();
  const { data, isLoading } = useGetList<Setting>('settings', {
    pagination: { page: 1, perPage: 200 },
    sort: { field: 'key', order: 'ASC' },
  });

  const settings = data ?? [];
  const locale: 'fr' | 'en' = localeState === 'en' ? 'en' : 'fr';

  // Group, preserving GROUPS order; drop empty sections.
  const sections = GROUPS.map((g) => ({
    def: g,
    rows: settings.filter((s) => groupOf(s.key) === g.id),
  })).filter((sec) => sec.rows.length > 0);

  return (
    <CelvaSkin>
      <Title title={t('resources.settings.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="between" style={{ marginBottom: 18, alignItems: 'flex-start', gap: 12 }}>
          <div style={{ maxWidth: '60ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              {t('ui.reglages.title')}
            </div>
            <div className="note">{t('ui.reglages.intro')}</div>
          </div>
        </div>

        {settings.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<SettingsIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : t('ui.reglages.empty')}
              sub={isLoading ? undefined : t('ui.reglages.emptySub')}
            />
          </div>
        ) : (
          <div className="set-grid">
            {sections.map(({ def, rows }) => {
              const Icon = def.icon;
              return (
                <div key={def.id} className="set-section">
                  <div className="set-head">
                    <div className="set-ic">
                      <Icon sx={{ fontSize: 18 }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="set-title">{t(`ui.reglages.groups.${def.id}.title`)}</div>
                      <div className="note" style={{ marginTop: 2 }}>
                        {t(`ui.reglages.groups.${def.id}.sub`)}
                      </div>
                    </div>
                  </div>
                  <div className="set-body">
                    {rows.map((s) => {
                      const value = (s.value ?? '').trim();
                      return (
                        <div
                          key={s.key}
                          className="set-row"
                          onClick={() => redirect('edit', 'settings', s.key)}
                        >
                          <div className="set-k">
                            {settingLabel(s, locale)}
                            <span className="set-key">{s.key}</span>
                          </div>
                          <div className={`set-v${value ? '' : ' empty'}`}>
                            {value || t('ui.reglages.notSet')}
                          </div>
                          <div className="set-chev">
                            <ChevronRightIcon sx={{ fontSize: 18 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
