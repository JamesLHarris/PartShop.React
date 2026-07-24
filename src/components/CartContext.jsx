import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import shopifyCheckoutService from "../service/shopifyCheckoutService";

const CartCtx = createContext();
const CART_KEY = "cartV1";
const PENDING_CHECKOUTS_KEY = "site2024PendingCheckoutsV1";
const MAX_PENDING_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeId = (value) => String(value ?? "").trim();

const normalizeCheckoutItems = (checkoutItems) => {
  return (checkoutItems || [])
    .map((item) => ({
      id: normalizeId(item?.partId ?? item?.id ?? item?.Id),
      qty: Math.max(1, Number(item?.quantity ?? item?.qty ?? 1) || 1),
    }))
    .filter((item) => item.id);
};

const subtractPurchasedItems = (cartItems, completedSessions) => {
  const purchasedByPartId = new Map();

  completedSessions.forEach((session) => {
    (session.items || []).forEach((item) => {
      const id = normalizeId(item.id);
      if (!id) return;

      const quantity = Math.max(1, Number(item.qty) || 1);
      purchasedByPartId.set(
        id,
        (purchasedByPartId.get(id) || 0) + quantity,
      );
    });
  });

  return cartItems
    .map((item) => {
      const id = normalizeId(item.id ?? item.partId ?? item.Id);
      const purchasedQuantity = purchasedByPartId.get(id) || 0;

      if (purchasedQuantity <= 0) {
        return item;
      }

      const remainingQuantity = Math.max(
        0,
        (Number(item.qty) || 0) - purchasedQuantity,
      );

      return {
        ...item,
        qty: remainingQuantity,
      };
    })
    .filter((item) => Number(item.qty) > 0);
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readJson(CART_KEY, []));
  const reconciliationInFlight = useRef(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((payload, qty = 1) => {
    const id = payload.id ?? payload.partId ?? payload.Id;
    const name =
      payload.name ?? payload.Name ?? payload.title ?? payload.Title;
    const image =
      payload.image ??
      payload.ImageUrl ??
      payload.imageUrl ??
      payload.image_path;
    const unitPrice = Number(
      payload.unitPrice ?? payload.price ?? payload.Price ?? 0,
    );
    const maxQuantityRaw = Number(
      payload.maxQuantity ??
        payload.quantityAvailable ??
        payload.QuantityAvailable ??
        0,
    );
    const maxQuantity =
      Number.isFinite(maxQuantityRaw) && maxQuantityRaw > 0
        ? maxQuantityRaw
        : null;

    setItems((previous) => {
      const next = [...previous];
      const existingIndex = next.findIndex(
        (item) => normalizeId(item.id) === normalizeId(id),
      );

      if (existingIndex >= 0) {
        const existingMax = next[existingIndex].maxQuantity || maxQuantity;
        const desiredQty = (next[existingIndex].qty || 0) + qty;

        next[existingIndex] = {
          ...next[existingIndex],
          maxQuantity: existingMax,
          qty: existingMax
            ? Math.min(desiredQty, existingMax)
            : desiredQty,
        };
      } else {
        next.push({
          id,
          name,
          image,
          unitPrice,
          maxQuantity,
          qty: maxQuantity
            ? Math.min(Math.max(1, qty), maxQuantity)
            : Math.max(1, qty),
        });
      }

      return next;
    });
  }, []);

  const updateQty = useCallback((id, qty) => {
    setItems((previous) =>
      previous
        .map((item) => {
          if (normalizeId(item.id) !== normalizeId(id)) {
            return item;
          }

          const desiredQty = Math.max(0, Number(qty) || 0);
          const cappedQty = item.maxQuantity
            ? Math.min(desiredQty, item.maxQuantity)
            : desiredQty;

          return {
            ...item,
            qty: cappedQty,
          };
        })
        .filter((item) => item.qty > 0),
    );
  }, []);

  const remove = useCallback((id) => {
    setItems((previous) =>
      previous.filter(
        (item) => normalizeId(item.id) !== normalizeId(id),
      ),
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const registerPendingCheckout = useCallback(
    (checkoutToken, checkoutItems) => {
      const token = String(checkoutToken || "").trim();
      const normalizedItems = normalizeCheckoutItems(checkoutItems);

      if (!token || normalizedItems.length === 0) {
        return;
      }

      const stored = readJson(PENDING_CHECKOUTS_KEY, []);
      const existing = Array.isArray(stored) ? stored : [];
      const next = [
        ...existing.filter((session) => session?.token !== token),
        {
          token,
          createdAtUtc: new Date().toISOString(),
          items: normalizedItems,
        },
      ];

      localStorage.setItem(PENDING_CHECKOUTS_KEY, JSON.stringify(next));
    },
    [],
  );

  const reconcileCompletedCheckouts = useCallback(async () => {
    if (reconciliationInFlight.current) {
      return;
    }

    const pending = readJson(PENDING_CHECKOUTS_KEY, []);
    if (!Array.isArray(pending) || pending.length === 0) {
      return;
    }

    reconciliationInFlight.current = true;

    try {
      const now = Date.now();
      const activeSessions = pending.filter((session) => {
        if (!session?.token) {
          return false;
        }

        const createdAt = Date.parse(session.createdAtUtc || "");
        return (
          !Number.isFinite(createdAt) ||
          now - createdAt <= MAX_PENDING_AGE_MS
        );
      });

      const checkedSessions = await Promise.all(
        activeSessions.map(async (session) => {
          try {
            const response =
              await shopifyCheckoutService.getCheckoutStatus(session.token);

            return {
              session,
              isCompleted: Boolean(response?.item?.isCompleted),
            };
          } catch {
            // Keep the pending token during temporary API/network problems.
            return {
              session,
              isCompleted: false,
            };
          }
        }),
      );

      const completedSessions = checkedSessions
        .filter((entry) => entry.isCompleted)
        .map((entry) => entry.session);

      if (completedSessions.length > 0) {
        setItems((currentItems) =>
          subtractPurchasedItems(currentItems, completedSessions),
        );

        window.dispatchEvent(
          new CustomEvent("site-checkout-completed", {
            detail: {
              count: completedSessions.length,
            },
          }),
        );
      }

      const remaining = checkedSessions
        .filter((entry) => !entry.isCompleted)
        .map((entry) => entry.session);

      localStorage.setItem(
        PENDING_CHECKOUTS_KEY,
        JSON.stringify(remaining),
      );
    } finally {
      reconciliationInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      reconcileCompletedCheckouts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reconcileCompletedCheckouts();
      }
    };

    reconcileCompletedCheckouts();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [reconcileCompletedCheckouts]);

  const subtotal = items.reduce(
    (sum, item) =>
      sum + (Number(item.qty) || 0) * Number(item.unitPrice || 0),
    0,
  );
  const count = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0),
    0,
  );

  const value = useMemo(
    () => ({
      items,
      add,
      updateQty,
      remove,
      clear,
      subtotal,
      count,
      registerPendingCheckout,
      reconcileCompletedCheckouts,
    }),
    [
      items,
      add,
      updateQty,
      remove,
      clear,
      subtotal,
      count,
      registerPendingCheckout,
      reconcileCompletedCheckouts,
    ],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
