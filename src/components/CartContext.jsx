import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext();
const CART_KEY = "cartV1";

export function CartProvider({ children }) {
  // The cart items live here; shape: [{ id, name, image, unitPrice, qty }]
  const [items, setItems] = useState(() => readCart());

  // Persist to localStorage whenever items change
  useEffect(() => {
    writeCart(items);
  }, [items]);

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    } catch {
      return [];
    }
  }
  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  // Add: upsert by id; qty accumulates
  const add = (payload, qty = 1) => {
    const id = payload.id ?? payload.partId ?? payload.Id;
    const name = payload.name ?? payload.Name ?? payload.title ?? payload.Title;
    const image =
      payload.image ??
      payload.ImageUrl ??
      payload.imageUrl ??
      payload.image_path;
    const unitPrice = Number(
      payload.unitPrice ?? payload.price ?? payload.Price ?? 0
    );
    const maxQuantityRaw = Number(
      payload.maxQuantity ?? payload.quantityAvailable ?? payload.QuantityAvailable ?? 0
    );
    const maxQuantity = Number.isFinite(maxQuantityRaw) && maxQuantityRaw > 0 ? maxQuantityRaw : null;

    setItems((prev) => {
      const next = [...prev];
      const i = next.findIndex((x) => x.id === id);
      if (i >= 0) {
        const existingMax = next[i].maxQuantity || maxQuantity;
        const desiredQty = (next[i].qty || 0) + qty;
        next[i] = {
          ...next[i],
          maxQuantity: existingMax,
          qty: existingMax ? Math.min(desiredQty, existingMax) : desiredQty,
        };
      }
      else next.push({ id, name, image, unitPrice, maxQuantity, qty: maxQuantity ? Math.min(Math.max(1, qty), maxQuantity) : Math.max(1, qty) });
      return next;
    });
  };

  // Update: set qty (0 removes line)
  const updateQty = (id, qty) => {
    setItems((prev) =>
      prev
        .map((x) => {
          if (x.id !== id) return x;

          const desiredQty = Math.max(0, Number(qty) || 0);
          const cappedQty = x.maxQuantity
            ? Math.min(desiredQty, x.maxQuantity)
            : desiredQty;

          return { ...x, qty: cappedQty };
        })
        .filter((x) => x.qty > 0)
    );
  };

  // Remove line or clear all
  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const clear = () => setItems([]);

  // Derived values (recomputed when items change)
  const subtotal = items.reduce(
    (s, x) => s + x.qty * Number(x.unitPrice || 0),
    0
  );
  const count = items.reduce((s, x) => s + x.qty, 0);

  // Stable object reference so consumers don’t re-render unnecessarily
  const value = useMemo(
    () => ({ items, add, updateQty, remove, clear, subtotal, count }),
    [items, subtotal, count]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
