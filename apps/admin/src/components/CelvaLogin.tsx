import { Login, LoginForm } from 'react-admin';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslate } from 'react-admin';

const Brand = () => {
  const t = useTranslate();
  return (
    <Stack alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, letterSpacing: 1 }}>
        CELVA
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('celva.login_subtitle')}
      </Typography>
    </Stack>
  );
};

export const CelvaLogin = () => (
  <Login backgroundImage="">
    <Box sx={{ p: 2 }}>
      <Brand />
      <LoginForm />
    </Box>
  </Login>
);
