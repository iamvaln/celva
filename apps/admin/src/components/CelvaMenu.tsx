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
  const { permissions } = usePermissions<string>();
  const isAdmin = permissions === 'ADMIN';

  return (
    <Menu>
      <Menu.DashboardItem primaryText="menu.dashboard" leftIcon={<NavDashboard />} />

      {/* VENTES — daily starting point (spec §4) */}
      <MenuGroup labelKey="menu.sales" icon={<NavSales />} defaultOpen>
        <Menu.ResourceItem name="orders" />
        <Menu.ResourceItem name="deliveries" />
        <Menu.ResourceItem name="promo-codes" />
      </MenuGroup>

      <MenuGroup labelKey="menu.catalog" icon={<NavCatalog />}>
        <Menu.ResourceItem name="products" />
        <Menu.ResourceItem name="collections" />
        <Menu.ResourceItem name="categories" />
        <Menu.ResourceItem name="size-guides" />
        <Menu.ResourceItem name="variants" />
        <Menu.ResourceItem name="attributes" />
        <Menu.ResourceItem name="attribute-values" />
      </MenuGroup>

      <MenuGroup labelKey="menu.stock" icon={<NavStock />}>
        <Menu.ResourceItem name="suppliers" />
        <Menu.ResourceItem name="raw-materials" />
        <Menu.ResourceItem name="purchase-orders" />
        <Menu.ResourceItem name="production-orders" />
        <Menu.ResourceItem name="stock-movements" />
      </MenuGroup>

      {/* COMMERCIAL — resellers (spec §4) */}
      <MenuGroup labelKey="menu.commercial" icon={<NavCommercial />}>
        <Menu.ResourceItem name="consignments" />
        <Menu.ResourceItem name="sales-commissions" />
      </MenuGroup>

      <MenuGroup labelKey="menu.content" icon={<NavContent />}>
        <Menu.ResourceItem name="articles" />
        <Menu.ResourceItem name="newsletter" />
      </MenuGroup>

      <MenuGroup labelKey="menu.finance" icon={<NavFinance />}>
        <Menu.ResourceItem name="transactions" />
        <Menu.ResourceItem name="treasury" />
        <Menu.ResourceItem name="finance" />
      </MenuGroup>

      {/* PARAMÈTRES — config (spec §4): users, livraison & retrait,
          comptes d'encaissement, réglages, journal d'activité */}
      <MenuGroup labelKey="menu.settings" icon={<NavSettings />}>
        {isAdmin && <Menu.ResourceItem name="users" />}
        <Menu.ResourceItem name="delivery-zones" />
        <Menu.ResourceItem name="pickup-points" />
        {isAdmin && <Menu.ResourceItem name="payment-accounts" />}
        {isAdmin && <Menu.ResourceItem name="settings" />}
        <Menu.ResourceItem name="audit-logs" />
      </MenuGroup>
    </Menu>
  );
};
