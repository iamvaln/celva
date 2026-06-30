import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useCreatePath, useGetResourceLabel, useTranslate } from 'react-admin';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';

type Crumb = {
  label: string;
  to?: string;
};

/**
 * Parse the current pathname into a resource + action. React-Admin routes look
 * like `/<resource>`, `/<resource>/create`, `/<resource>/<id>` (edit) or
 * `/<resource>/<id>/show`. We only need the resource name and the leaf action.
 */
const parseLocation = (pathname: string) => {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const [resource, ...rest] = segments as [string, ...string[]];

  let action: 'create' | 'edit' | 'show' | undefined;
  if (rest.length >= 1) {
    if (rest[0] === 'create') action = 'create';
    else if (rest[rest.length - 1] === 'show') action = 'show';
    else action = 'edit';
  }

  return { resource, action };
};

/**
 * Lightweight breadcrumb trail derived from the router location and React-Admin
 * core hooks. Renders Home → Resource → action, hidden on the dashboard/home.
 */
export const Breadcrumb = () => {
  const location = useLocation();
  const translate = useTranslate();
  const getResourceLabel = useGetResourceLabel();
  const createPath = useCreatePath();

  const crumbs = useMemo<Crumb[]>(() => {
    const parsed = parseLocation(location.pathname);
    if (!parsed) return [];

    const items: Crumb[] = [
      {
        label: getResourceLabel(parsed.resource, 2),
        to: createPath({ resource: parsed.resource, type: 'list' }),
      },
    ];

    if (parsed.action) {
      items.push({ label: translate(`ra.action.${parsed.action}`) });
    }

    return items;
  }, [location.pathname, getResourceLabel, createPath, translate]);

  // Hide on the dashboard/home where there is no resource context.
  if (crumbs.length === 0) return null;

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Breadcrumbs
        separator="/"
        aria-label="breadcrumb"
        sx={{ fontSize: 13, color: 'text.secondary' }}
      >
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13 }}
        >
          <HomeOutlinedIcon sx={{ fontSize: 15 }} />
          {translate('ra.page.dashboard')}
        </Link>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          if (isLast || !crumb.to) {
            return (
              <Typography key={index} sx={{ fontSize: 13, color: 'text.primary' }}>
                {crumb.label}
              </Typography>
            );
          }
          return (
            <Link
              key={index}
              component={RouterLink}
              to={crumb.to}
              underline="hover"
              color="inherit"
              sx={{ fontSize: 13 }}
            >
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
