import {
  AppBar,
  Layout,
  LocalesMenuButton,
  TitlePortal,
  ToggleThemeButton,
  useRedirect,
  useTranslate,
  type LayoutProps,
} from 'react-admin';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { CelvaMenu } from './CelvaMenu';
import { CelvaMonogram } from './CelvaMonogram';
import { CelvaCommandPalette } from './CelvaCommandPalette';
import { ForcePasswordChangeGuard } from './ForcePasswordChangeGuard';
import { Breadcrumb } from './Breadcrumb';
import { STOREFRONT_URL } from '../config';

// Quick link to the public storefront (opens in a new tab).
const StorefrontButton = () => {
  const t = useTranslate();
  return (
    <Tooltip title={t('ui.shell.view_store')}>
      <IconButton
        color="inherit"
        size="small"
        component="a"
        href={STOREFRONT_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <StorefrontIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

// Brand mark + wordmark, shown at the head of the bar (design brand corner).
const Brand = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 2, color: 'primary.main' }}>
    <CelvaMonogram size={26} />
    <Box sx={{ lineHeight: 1 }}>
      <Typography
        sx={{
          fontFamily: '"Bodoni Moda", serif',
          fontWeight: 700,
          fontSize: 19,
          letterSpacing: '0.16em',
          color: 'text.primary',
        }}
      >
        CELVA
      </Typography>
      <Typography
        sx={{
          fontSize: 9.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          mt: '1px',
        }}
      >
        Back-office
      </Typography>
    </Box>
  </Box>
);

const NotificationsButton = () => {
  const redirect = useRedirect();
  return (
    <Tooltip title="Journal d'activité">
      <IconButton color="inherit" size="small" onClick={() => redirect('/audit-logs')}>
        <NotificationsNoneIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

// White-surface header (redesign): brand + serif page title, then the global
// controls. Replaces the default coloured React-Admin AppBar.
const CelvaAppBar = () => (
  <AppBar
    color="default"
    elevation={0}
    sx={{
      bgcolor: 'background.paper',
      color: 'text.primary',
      borderBottom: '1px solid',
      borderColor: 'divider',
    }}
    toolbar={
      <>
        <StorefrontButton />
        <NotificationsButton />
        <LocalesMenuButton />
        <ToggleThemeButton />
      </>
    }
  >
    <Brand />
    <TitlePortal sx={{ fontFamily: '"Bodoni Moda", serif', fontWeight: 500, fontSize: 21 }} />
  </AppBar>
);

export const CelvaLayout = (props: LayoutProps) => (
  <Layout {...props} appBar={CelvaAppBar} menu={CelvaMenu}>
    <ForcePasswordChangeGuard />
    <CelvaCommandPalette />
    <Breadcrumb />
    {props.children}
  </Layout>
);
