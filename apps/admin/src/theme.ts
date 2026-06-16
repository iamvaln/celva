import { defaultTheme } from 'react-admin';
import type { RaThemeOptions } from 'react-admin';
import { celvaColors } from '@celva/tailwind-config/tokens';

const fontStack = '"Cormorant Garamond", "Garamond", Georgia, serif';
const displayStack = '"Bodoni Moda", "Didot", "Times New Roman", serif';

// Olive-tinted sidebar (brand charter): cream text, terracotta active. The one
// place the brand olive is kept in the otherwise-neutral redesign. Same in
// light + dark since it's a fixed brand element.
const SIDEBAR_BG = celvaColors.olive.dark; // #3F422D
const SIDEBAR_FG = celvaColors.cream;
const SIDEBAR_ITEM = 'rgba(250, 247, 242, 0.85)'; // resource items — clearly readable
const SIDEBAR_HEAD = 'rgba(250, 247, 242, 0.64)'; // group headers — subtle section labels
const SIDEBAR_ICON = 'rgba(250, 247, 242, 0.72)';
const SIDEBAR_HOVER = 'rgba(250, 247, 242, 0.1)';
const SIDEBAR_ACTIVE = celvaColors.terracotta.light; // #C4836B — pops on olive
const SIDEBAR_ACTIVE_BG = 'rgba(196, 131, 107, 0.18)';

const oliveSidebar = {
  styleOverrides: {
    root: {
      backgroundColor: SIDEBAR_BG,
      borderRight: 'none',
      '& .RaSidebar-fixed': { backgroundColor: SIDEBAR_BG },
      '& .MuiTypography-root': { color: 'inherit' },
      '& .MuiSvgIcon-root': { color: SIDEBAR_ICON },
      // resource links (Commandes, Livraisons…) — readable
      '& .RaMenuItemLink-root': { color: SIDEBAR_ITEM },
      // group headers (VENTES, CATALOGUE…) — intentionally quieter
      '& .MuiListItemButton-root': { color: SIDEBAR_HEAD },
      '& .RaMenuItemLink-root:hover, & .MuiListItemButton-root:hover': {
        backgroundColor: SIDEBAR_HOVER,
        color: SIDEBAR_FG,
      },
      '& .RaMenuItemLink-root:hover .MuiSvgIcon-root, & .MuiListItemButton-root:hover .MuiSvgIcon-root':
        { color: SIDEBAR_FG },
      '& .RaMenuItemLink-active': {
        color: SIDEBAR_ACTIVE,
        backgroundColor: SIDEBAR_ACTIVE_BG,
        fontWeight: 600,
        boxShadow: `inset 3px 0 0 ${SIDEBAR_ACTIVE}`,
      },
      '& .RaMenuItemLink-active .MuiSvgIcon-root': { color: SIDEBAR_ACTIVE },
    },
  },
} as const;

export const celvaLightTheme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'light',
    // Neutral default (redesign): near black-and-white surfaces, terracotta
    // as the lone action accent. Warm brand palette is opt-in (data-palette).
    primary: { main: celvaColors.terracotta.DEFAULT, contrastText: celvaColors.cream },
    secondary: { main: celvaColors.olive.DEFAULT, contrastText: celvaColors.cream },
    error: { main: '#BC5249' },
    background: { default: '#F4F4F2', paper: '#FFFFFF' },
    text: { primary: '#232320', secondary: '#65635E' },
    divider: '#E0DFDB',
  },
  typography: {
    fontFamily: fontStack,
    h1: { fontFamily: displayStack, fontWeight: 700 },
    h2: { fontFamily: displayStack, fontWeight: 400 },
    h3: { fontFamily: displayStack, fontWeight: 400 },
    h4: { fontFamily: displayStack, fontWeight: 400 },
    h5: { fontFamily: displayStack, fontWeight: 400 },
    h6: { fontFamily: displayStack, fontWeight: 500 },
    button: { fontFamily: fontStack, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: 0 },
  components: {
    // Dense tables by default — back-office tools live on this surface, and
    // the airy MUI default makes long lists slow to scan.
    MuiTable: { defaultProps: { size: 'small' } },
    // Olive-tinted brand sidebar (charter green), cream text, terracotta active.
    RaSidebar: oliveSidebar,
  },
};

export const celvaDarkTheme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'dark',
    primary: { main: celvaColors.terracotta.light, contrastText: celvaColors.ink },
    secondary: { main: celvaColors.olive.light, contrastText: celvaColors.cream },
    error: { main: '#CB675D' },
    background: { default: '#151514', paper: '#201F1E' },
    text: { primary: '#ECEBE7', secondary: '#9C9A93' },
    divider: '#34332F',
  },
  typography: {
    fontFamily: fontStack,
    h1: { fontFamily: displayStack, fontWeight: 700 },
    h2: { fontFamily: displayStack, fontWeight: 400 },
    h3: { fontFamily: displayStack, fontWeight: 400 },
    h4: { fontFamily: displayStack, fontWeight: 400 },
    h5: { fontFamily: displayStack, fontWeight: 400 },
    h6: { fontFamily: displayStack, fontWeight: 500 },
    button: { fontFamily: fontStack, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: 0 },
  components: {
    // Dense tables by default — back-office tools live on this surface, and
    // the airy MUI default makes long lists slow to scan.
    MuiTable: { defaultProps: { size: 'small' } },
    // Olive-tinted brand sidebar (charter green), cream text, terracotta active.
    RaSidebar: oliveSidebar,
  },
};
