import { useState } from 'react';
import { Title, useNotify, useTranslate } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Stack,
  TextField as MuiTextField,
  Typography,
  Button as MuiButton,
} from '@mui/material';
import { fetchJson } from '../http';
import { API_BASE, STORAGE_KEYS } from '../config';
import type { AdminUser } from '../types';

/**
 * Forced password-change screen. Reached either by clicking a profile link
 * or — for users whose row has mustChangePassword=true — automatically via
 * the route guard in CelvaLayout. On success we clear the local flag and
 * navigate to the dashboard.
 */
export const ChangePasswordPage = () => {
  const t = useTranslate();
  const notify = useNotify();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next !== confirm) {
      notify('change_password.mismatch', { type: 'error' });
      return;
    }
    if (next.length < 8) {
      notify('errors.password_too_short', { type: 'error' });
      return;
    }
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/auth/me/password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      // Clear the local flag so the guard stops redirecting.
      const raw = window.localStorage.getItem(STORAGE_KEYS.userPreview);
      if (raw) {
        const user = JSON.parse(raw) as AdminUser;
        user.mustChangePassword = false;
        window.localStorage.setItem(STORAGE_KEYS.userPreview, JSON.stringify(user));
      }
      notify('change_password.success', { type: 'success' });
      navigate('/', { replace: true });
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  // Detect whether this is a forced visit (driven by the route guard) so
  // the copy can lean a bit harder.
  const userPreview = window.localStorage.getItem(STORAGE_KEYS.userPreview);
  const forced = userPreview
    ? (JSON.parse(userPreview) as AdminUser).mustChangePassword === true
    : false;

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <Title title={t('change_password.title')} />
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t('change_password.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {forced ? t('change_password.forced_body') : t('change_password.body')}
          </Typography>
          <Stack spacing={2}>
            <MuiTextField
              label={t('change_password.current')}
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              fullWidth
              autoComplete="current-password"
            />
            <MuiTextField
              label={t('change_password.new')}
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              fullWidth
              autoComplete="new-password"
            />
            <MuiTextField
              label={t('change_password.confirm')}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
              autoComplete="new-password"
            />
            <MuiButton
              variant="contained"
              disabled={busy || !current || !next || !confirm}
              onClick={() => void submit()}
            >
              {t('change_password.submit')}
            </MuiButton>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
