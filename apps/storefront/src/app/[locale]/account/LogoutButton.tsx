'use client';

import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';

export const LogoutButton = ({ label }: { label: string }) => {
  const router = useRouter();
  const [pending, start] = useTransition();

  const logout = () => {
    start(async () => {
      await Promise.allSettled([
        fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }),
        fetch('/auth/session', { method: 'DELETE', credentials: 'include' }),
      ]);
      router.push('/');
      router.refresh();
    });
  };

  return (
    <button type="button" onClick={logout} disabled={pending} className="btn btn-primary">
      {label}
    </button>
  );
};
