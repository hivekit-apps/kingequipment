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
  cartStartDate: string;
  cartEndDate: string;
  setCartDates: (startDate: string, endDate: string) => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'ke_cart_v1';
const CITY_KEY = 'ke_cart_city_v1';
const DATES_KEY = 'ke_cart_dates_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [city, setCityState] = useState<string>('');
  const [cartStartDate, setCartStartDateState] = useState<string>('');
  const [cartEndDate, setCartEndDateState] = useState<string>('');
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
      const savedDatesRaw = localStorage.getItem(DATES_KEY);
      if (savedDatesRaw) {
        const parsedDates = JSON.parse(savedDatesRaw) as {
          startDate?: string;
          endDate?: string;
        };
        if (parsedDates.startDate) setCartStartDateState(parsedDates.startDate);
        if (parsedDates.endDate) setCartEndDateState(parsedDates.endDate);
      }
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        DATES_KEY,
        JSON.stringify({ startDate: cartStartDate, endDate: cartEndDate }),
      );
    } catch {
      // ignore
    }
  }, [cartStartDate, cartEndDate, hydrated]);

  const applyGlobalDatesToRentals = useCallback(
    (list: CartItem[], startDate: string, endDate: string): CartItem[] =>
      list.map((it) =>
        it.kind === 'rent'
          ? { ...it, startDate, endDate }
          : it,
      ),
    [],
  );

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // Rental "last-added-wins": if this is a rental with dates, promote them
      // to the global cart dates and apply to every existing rental too.
      let next = prev.slice();
      if (item.kind === 'rent' && item.startDate && item.endDate) {
        setCartStartDateState(item.startDate);
        setCartEndDateState(item.endDate);
        next = applyGlobalDatesToRentals(next, item.startDate, item.endDate);
      }
      const idx = next.findIndex(
        (p) => p.equipmentId === item.equipmentId && p.kind === item.kind,
      );
      if (idx >= 0) {
        const merged = { ...next[idx], ...item, qty: (next[idx].qty || 1) + (item.qty || 1) };
        next[idx] = merged;
        return next;
      }
      return [...next, { ...item, qty: item.qty || 1 }];
    });
  }, [applyGlobalDatesToRentals]);

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
    setCartStartDateState('');
    setCartEndDateState('');
  }, []);

  const setCity = useCallback((slug: string) => setCityState(slug), []);

  const setCartDates = useCallback(
    (startDate: string, endDate: string) => {
      setCartStartDateState(startDate);
      setCartEndDateState(endDate);
      setItems((prev) => applyGlobalDatesToRentals(prev, startDate, endDate));
    },
    [applyGlobalDatesToRentals],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateItem,
      clearCart,
      city,
      setCity,
      cartStartDate,
      cartEndDate,
      setCartDates,
      hydrated,
    }),
    [
      items,
      addItem,
      removeItem,
      updateItem,
      clearCart,
      city,
      setCity,
      cartStartDate,
      cartEndDate,
      setCartDates,
      hydrated,
    ],
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
      cartStartDate: '',
      cartEndDate: '',
      setCartDates: () => {},
      hydrated: false,
    };
  }
  return ctx;
}
