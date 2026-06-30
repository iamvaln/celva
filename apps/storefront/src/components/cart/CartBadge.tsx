'use client';

import { useGuestCartCount } from '@/lib/guest-cart';

/**
 * Header cart count badge for the guest (localStorage) cart. Renders nothing
 * for logged-in users — their cart is merged server-side on login and the
 * local count is then 0.
 */
export function CartBadge() {
  const count = useGuestCartCount();
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 font-body text-[10px] font-medium leading-none text-foreground-inverse">
      {count > 9 ? '9+' : count}
    </span>
  );
}
