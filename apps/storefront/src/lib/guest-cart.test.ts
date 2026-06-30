import { beforeEach, describe, expect, it } from 'vitest';
import {
  addGuestItem,
  getGuestCart,
  getGuestCartCount,
  setGuestQty,
  removeGuestItem,
  clearGuestCart,
  type GuestCartItem,
} from './guest-cart';

const line = (over: Partial<GuestCartItem> = {}): GuestCartItem => ({
  variantId: 'v1',
  quantity: 1,
  productSlug: 'robe-douala',
  name: 'Robe Douala',
  unitPrice: '25000',
  maxStock: 5,
  ...over,
});

describe('guest cart', () => {
  beforeEach(() => {
    clearGuestCart();
  });

  it('adds a new line', () => {
    addGuestItem(line());
    const cart = getGuestCart();
    expect(cart).toHaveLength(1);
    expect(cart[0]!.variantId).toBe('v1');
    expect(getGuestCartCount()).toBe(1);
  });

  it('accumulates quantity for an existing variant', () => {
    addGuestItem(line({ quantity: 2 }));
    addGuestItem(line({ quantity: 1 }));
    const cart = getGuestCart();
    expect(cart).toHaveLength(1);
    expect(cart[0]!.quantity).toBe(3);
    expect(getGuestCartCount()).toBe(3);
  });

  it('clamps an added quantity to available stock', () => {
    addGuestItem(line({ quantity: 99, maxStock: 5 }));
    expect(getGuestCart()[0]!.quantity).toBe(5);
  });

  it('clamps the accumulated quantity to stock', () => {
    addGuestItem(line({ quantity: 4, maxStock: 5 }));
    addGuestItem(line({ quantity: 4, maxStock: 5 }));
    expect(getGuestCart()[0]!.quantity).toBe(5);
  });

  it('keeps a minimum quantity of 1', () => {
    addGuestItem(line({ quantity: 0 }));
    expect(getGuestCart()[0]!.quantity).toBe(1);
  });

  it('refreshes the price/label snapshot on re-add', () => {
    addGuestItem(line({ unitPrice: '25000', name: 'Old' }));
    addGuestItem(line({ unitPrice: '30000', name: 'New' }));
    const item = getGuestCart()[0]!;
    expect(item.unitPrice).toBe('30000');
    expect(item.name).toBe('New');
  });

  it('setGuestQty clamps and updates the line', () => {
    addGuestItem(line({ maxStock: 5 }));
    setGuestQty('v1', 3);
    expect(getGuestCart()[0]!.quantity).toBe(3);
    setGuestQty('v1', 99);
    expect(getGuestCart()[0]!.quantity).toBe(5);
    setGuestQty('v1', 0);
    expect(getGuestCart()[0]!.quantity).toBe(1);
  });

  it('setGuestQty is a no-op for an unknown variant', () => {
    addGuestItem(line());
    setGuestQty('does-not-exist', 4);
    expect(getGuestCart()[0]!.quantity).toBe(1);
  });

  it('removes a single line', () => {
    addGuestItem(line({ variantId: 'v1' }));
    addGuestItem(line({ variantId: 'v2' }));
    removeGuestItem('v1');
    const cart = getGuestCart();
    expect(cart).toHaveLength(1);
    expect(cart[0]!.variantId).toBe('v2');
  });

  it('clears the whole cart', () => {
    addGuestItem(line({ variantId: 'v1' }));
    addGuestItem(line({ variantId: 'v2' }));
    clearGuestCart();
    expect(getGuestCart()).toHaveLength(0);
    expect(getGuestCartCount()).toBe(0);
  });

  it('counts across multiple lines', () => {
    addGuestItem(line({ variantId: 'v1', quantity: 2, maxStock: 9 }));
    addGuestItem(line({ variantId: 'v2', quantity: 3, maxStock: 9 }));
    expect(getGuestCartCount()).toBe(5);
  });
});
