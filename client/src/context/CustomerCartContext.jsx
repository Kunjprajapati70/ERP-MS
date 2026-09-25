import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'erp_customer_cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CustomerCartProvider({ children }) {
  const [items, setItems] = useState(() => loadCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const api = useMemo(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      addItem(product, quantity = 1) {
        setItems((prev) => {
          const qty = Math.max(1, Number(quantity) || 1);
          const existing = prev.find((i) => i.productId === product._id);
          if (existing) {
            return prev.map((i) =>
              i.productId === product._id
                ? { ...i, quantity: i.quantity + qty, name: product.name, sku: product.sku, price: product.sellingPrice, imageUrl: product.imageUrl || i.imageUrl }
                : i
            );
          }
          return [
            ...prev,
            {
              productId: product._id,
              name: product.name,
              sku: product.sku,
              price: product.sellingPrice,
              imageUrl: product.imageUrl || '',
              quantity: qty,
            },
          ];
        });
      },
      updateQty(productId, quantity) {
        const qty = Math.max(1, Number(quantity) || 1);
        setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
      },
      removeItem(productId) {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
      },
      clear() {
        setItems([]);
      },
    }),
    [items]
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCustomerCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCustomerCart must be used within CustomerCartProvider');
  }
  return ctx;
}
