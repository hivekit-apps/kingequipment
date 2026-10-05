'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type CartItem = {
  equipmentId: string;
  kind: 'rent' | 'buy';
  qty: number;
  startDate?: string;
  endDate?: string;
  city?: string;
  buyCondition?: 'new' | 'used';
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (equipmentId: string, kind: 'rent' | 'buy') => void;
  updateItem: (equipmentId: string, kind: 'rent' | 'buy', patch: Partial<CartItem>) => void;
  clearCart: () => void;
  city: string;
  setCity: (slug: string) => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'ke_cart_v1';
const CITY_KEY = 'ke_cart_city_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [city, setCityState] = useState<string>('');
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
      const savedCity = localStorage.getItem(CITY_KEY) || '';
      if (savedCity) setCityState(savedCity);
    } catch {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CITY_KEY, city);
    } catch {
      // ignore
    }
  }, [city, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (p) => p.equipmentId === item.equipmentId && p.kind === item.kind,
      );
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], ...item, qty: (next[idx].qty || 1) + (item.qty || 1) };
        return next;
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
  }, []);

  const removeItem = useCallback((equipmentId: string, kind: 'rent' | 'buy') => {
    setItems((prev) => prev.filter((p) => !(p.equipmentId === equipmentId && p.kind === kind)));
  }, []);

  const updateItem = useCallback(
    (equipmentId: string, kind: 'rent' | 'buy', patch: Partial<CartItem>) => {
      setItems((prev) =>
        prev.map((p) =>
          p.equipmentId === equipmentId && p.kind === kind ? { ...p, ...patch } : p,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const setCity = useCallback((slug: string) => setCityState(slug), []);

  const value = useMemo<CartContextValue>(
    () => ({ items, addItem, removeItem, updateItem, clearCart, city, setCity, hydrated }),
    [items, addItem, removeItem, updateItem, clearCart, city, setCity, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    // Return an inert fallback so SSR/isolated-import contexts don't crash.
    return {
      items: [],
      addItem: () => {},
      removeItem: () => {},
      updateItem: () => {},
      clearCart: () => {},
      city: '',
      setCity: () => {},
      hydrated: false,
    };
  }
  return ctx;
}
