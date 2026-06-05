import type { ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

/**
 * Wraps brand-skinned screens (dashboard, orders) so the ported design-system
 * CSS in celva-skin.css resolves its tokens, and follows the active MUI theme
 * (light/dark) via the data-theme attribute.
 */
export const CelvaSkin = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  return (
    <div className="celva-skin" data-theme={theme.palette.mode}>
      {children}
    </div>
  );
};
