'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Guest cart — a client-side, localStorage-backed cart for shoppers who are
 * not logged in. Each line carries a display snapshot (name, price, image,
 * options) taken at add-time so the cart/checkout pages need no server cart.
 * On login the lines are merged into the server cart (see mergeGuestCartAction)
 * and cleared here.
 */

const KEY = 'celva.guestCart.v1';
const EVENT = 'celva:guestcart';

export type GuestCartItem = {
  variantId: string;
  quantity: number;
  productSlug: string;
  /** Localized product name at add-time. */
  name: string;
  /** Unit price as an XAF string. */
  unitPrice: string;
  /** Hero image URL, when available. */
  image?: string;
  /** Selected option labels, e.g. "Taille: L · Couleur: Rouge". */
  options?: string;
  /** Stock available at add-time, used to clamp quantity. */
  maxStock: number;
};

const isBrowser = (): boolean => typeof window !== 'undefined';

const read = (): GuestCartItem[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GuestCartItem[]) : [];
  } catch {
    return [];
  }
};

const write = (items: GuestCartItem[]): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
};

export const getGuestCart = (): GuestCartItem[] => read();

export const getGuestCartCount = (): number =>
  read().reduce((sum, it) => sum + it.quantity, 0);

const clampQty = (qty: number, max: number): number =>
  Math.max(1, Math.min(qty, Math.max(1, max)));

/** Adds a line, accumulating quantity (clamped to stock) when it already exists. */
export const addGuestItem = (item: GuestCartItem): void => {
  const items = read();
  const existing = items.find((it) => it.variantId === item.variantId);
  if (existing) {
    existing.quantity = clampQty(existing.quantity + item.quantity, item.maxStock);
    // Refresh the snapshot so price/labels stay current.
    existing.name = item.name;
    existing.unitPrice = item.unitPrice;
    existing.image = item.image;
    existing.options = item.options;
    existing.productSlug = item.productSlug;
    existing.maxStock = item.maxStock;
    write([...items]);
    return;
  }
  write([...items, { ...item, quantity: clampQty(item.quantity, item.maxStock) }]);
};

export const setGuestQty = (variantId: string, quantity: number): void => {
  const items = read();
  const it = items.find((x) => x.variantId === variantId);
  if (!it) return;
  it.quantity = clampQty(quantity, it.maxStock);
  write([...items]);
};

export const removeGuestItem = (variantId: string): void => {
  write(read().filter((it) => it.variantId !== variantId));
};

export const clearGuestCart = (): void => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
};

const subscribe = (cb: () => void): (() => void) => {
  if (!isBrowser()) return () => undefined;
  window.addEventListener(EVENT, cb);
  // Cross-tab updates.
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
};

// useSyncExternalStore needs a stable snapshot reference between renders, so we
// cache the parsed array and only swap it when the serialized value changes.
let cachedRaw = '';
let cachedItems: GuestCartItem[] = [];

const getItemsSnapshot = (): GuestCartItem[] => {
  if (!isBrowser()) return cachedItems;
  const raw = window.localStorage.getItem(KEY) ?? '';
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = read();
  }
  return cachedItems;
};

const EMPTY: GuestCartItem[] = [];
const getServerSnapshot = (): GuestCartItem[] => EMPTY;

/** Reactive guest cart lines. Empty during SSR (avoids hydration mismatch). */
export const useGuestCart = (): GuestCartItem[] =>
  useSyncExternalStore(subscribe, getItemsSnapshot, getServerSnapshot);

/** Reactive guest cart item count. */
export const useGuestCartCount = (): number => {
  const getCount = useCallback(
    () => getItemsSnapshot().reduce((sum, it) => sum + it.quantity, 0),
    [],
  );
  return useSyncExternalStore(subscribe, getCount, () => 0);
};
