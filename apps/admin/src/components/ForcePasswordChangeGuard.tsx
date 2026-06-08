import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { STORAGE_KEYS } from '../config';
import type { AdminUser } from '../types';

/**
 * If the logged-in user has mustChangePassword=true on their cached profile,
 * shove them to /change-password and keep them there until they change it.
 * Renders nothing — pure side effect.
 *
 * The flag is cleared by ChangePasswordPage on successful submit.
 */
export const ForcePasswordChangeGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEYS.userPreview);
    if (!raw) return;
    let user: AdminUser;
    try {
      user = JSON.parse(raw) as AdminUser;
    } catch {
      return;
    }
    if (user.mustChangePassword && location.pathname !== '/change-password') {
      navigate('/change-password', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};
