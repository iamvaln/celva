import type { ReactNode } from 'react';
import { useStore } from 'react-admin';
import { useTheme } from '@mui/material/styles';

/**
 * Wraps brand-skinned screens so the ported design-system CSS in
 * celva-skin.css resolves its tokens. Follows the active MUI theme
 * (light/dark via data-theme) and the opt-in warm palette (data-palette,
 * stored under "celva.palette" — neutral by default).
 */
export const CelvaSkin = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const [palette] = useStore<'neutral' | 'warm'>('celva.palette', 'neutral');
  return (
    <div className="celva-skin" data-theme={theme.palette.mode} data-palette={palette}>
      {children}
    </div>
  );
};
