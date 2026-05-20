import { AppBar, Layout, LocalesMenuButton, TitlePortal, ToggleThemeButton, type LayoutProps } from 'react-admin';
import { Typography } from '@mui/material';

const CelvaAppBar = () => (
  <AppBar
    toolbar={
      <>
        <LocalesMenuButton />
        <ToggleThemeButton />
      </>
    }
  >
    <TitlePortal />
    <Typography
      variant="caption"
      sx={{ ml: 'auto', mr: 2, opacity: 0.8, letterSpacing: 1 }}
    >
      CELVA · ADMIN
    </Typography>
  </AppBar>
);

export const CelvaLayout = (props: LayoutProps) => <Layout {...props} appBar={CelvaAppBar} />;
