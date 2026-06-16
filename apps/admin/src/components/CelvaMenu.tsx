import { useState, type ReactNode } from 'react';
import { Menu, usePermissions, useSidebarState, useTranslate } from 'react-admin';
import {
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import {
  NavDashboard,
  NavSales,
  NavCatalog,
  NavStock,
  NavCommercial,
  NavContent,
  NavFinance,
  NavSettings,
} from './CelvaNavIcons';
import { canView } from '../permissions';

type MenuGroupProps = {
  labelKey: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

const MenuGroup = ({ labelKey, icon, defaultOpen = false, children }: MenuGroupProps) => {
  const t = useTranslate();
  const [sidebarOpen] = useSidebarState();
  const [open, setOpen] = useState(defaultOpen);

  // Collapsed rail (mini mode): drop the group chrome and render the items
  // flat so the icon rail + per-item tooltips keep working.
  if (!sidebarOpen) return <>{children}</>;

  return (
    <>
      <ListItemButton onClick={() => setOpen((v) => !v)} dense>
        <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
        <ListItemText
          primary={t(labelKey)}
          primaryTypographyProps={{ variant: 'overline', sx: { letterSpacing: 1 } }}
        />
        {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding dense sx={{ pl: 1 }}>
          {children}
        </List>
      </Collapse>
    </>
  );
};

export const CelvaMenu = () => {
  const { permissions: p } = usePermissions<string>();

  // Per-role visibility (UX §2): a group shows when the role can view at least
  // one of its domains; settings sub-items are gated individually.
  const sales = canView(p, 'orders') || canView(p, 'deliveries') || canView(p, 'payments') || canView(p, 'invoices') || canView(p, 'promo');
  const catalog = canView(p, 'catalog');
  const stock = canView(p, 'stock');
  const commercial = canView(p, 'commercial');
  const content = canView(p, 'content');
  const finance = canView(p, 'finance');
  const settingsDomain = canView(p, 'settings');
  const usersDomain = canView(p, 'users');
  const rolesDomain = canView(p, 'roles');
  const auditDomain = canView(p, 'audit');
  const params = usersDomain || settingsDomain || rolesDomain || auditDomain;

  return (
    <Menu>
      <Menu.DashboardItem primaryText="menu.dashboard" leftIcon={<NavDashboard />} />

      {/* VENTES — daily starting point (spec §4) */}
      {sales && (
        <MenuGroup labelKey="menu.sales" icon={<NavSales />} defaultOpen>
          {canView(p, 'orders') && <Menu.ResourceItem name="orders" />}
          {canView(p, 'deliveries') && <Menu.ResourceItem name="deliveries" />}
          {canView(p, 'payments') && <Menu.ResourceItem name="payments" />}
          {canView(p, 'invoices') && <Menu.ResourceItem name="invoices" />}
          {canView(p, 'promo') && <Menu.ResourceItem name="promo-codes" />}
        </MenuGroup>
      )}

      {catalog && (
        <MenuGroup labelKey="menu.catalog" icon={<NavCatalog />}>
          <Menu.ResourceItem name="products" />
          <Menu.ResourceItem name="collections" />
          <Menu.ResourceItem name="categories" />
          <Menu.ResourceItem name="size-guides" />
          <Menu.ResourceItem name="variants" />
          <Menu.ResourceItem name="attributes" />
          <Menu.ResourceItem name="attribute-values" />
        </MenuGroup>
      )}

      {/* STUDIO sur-mesure — a separate group (it has its own request workflow
          and isn't part of the regular catalogue). Gated by `catalog`. */}
      {catalog && (
        <MenuGroup labelKey="menu.studio" icon={<DesignServicesIcon />}>
          <Menu.ResourceItem name="studio-models" />
          <Menu.ResourceItem name="studio-fabrics" />
          <Menu.ResourceItem name="studio-gallery" />
          <Menu.ResourceItem name="studio-requests" />
        </MenuGroup>
      )}

      {stock && (
        <MenuGroup labelKey="menu.stock" icon={<NavStock />}>
          <Menu.ResourceItem name="suppliers" />
          <Menu.ResourceItem name="raw-materials" />
          <Menu.ResourceItem name="purchase-orders" />
          <Menu.ResourceItem name="production-orders" />
          <Menu.ResourceItem name="stock-movements" />
        </MenuGroup>
      )}

      {/* COMMERCIAL — resellers (spec §4) */}
      {commercial && (
        <MenuGroup labelKey="menu.commercial" icon={<NavCommercial />}>
          <Menu.ResourceItem name="consignments" />
          <Menu.ResourceItem name="sales-commissions" />
        </MenuGroup>
      )}

      {content && (
        <MenuGroup labelKey="menu.content" icon={<NavContent />}>
          <Menu.ResourceItem name="articles" />
          <Menu.ResourceItem name="newsletter" />
        </MenuGroup>
      )}

      {finance && (
        <MenuGroup labelKey="menu.finance" icon={<NavFinance />}>
          <Menu.ResourceItem name="transactions" />
          <Menu.ResourceItem name="treasury" />
          <Menu.ResourceItem name="partners" />
          <Menu.ResourceItem name="finance" />
        </MenuGroup>
      )}

      {/* PARAMÈTRES — config (spec §4): users, livraison & retrait,
          comptes d'encaissement, réglages, rôles, journal d'activité */}
      {params && (
        <MenuGroup labelKey="menu.settings" icon={<NavSettings />}>
          {usersDomain && <Menu.ResourceItem name="users" />}
          {settingsDomain && <Menu.ResourceItem name="delivery-zones" />}
          {settingsDomain && <Menu.ResourceItem name="pickup-points" />}
          {settingsDomain && <Menu.ResourceItem name="payment-accounts" />}
          {settingsDomain && <Menu.ResourceItem name="settings" />}
          {rolesDomain && <Menu.ResourceItem name="roles" />}
          {auditDomain && <Menu.ResourceItem name="audit-logs" />}
        </MenuGroup>
      )}
    </Menu>
  );
};
