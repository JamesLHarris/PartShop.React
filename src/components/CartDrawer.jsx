import { Link } from "react-router-dom";
import { useCart } from "./CartContext";
import "./Cart.css";

function CartDrawer({ open, onClose, onCheckout, isCheckingOut = false }) {
  const { items, updateQty, remove, subtotal, clear } = useCart();

  if (!open) {
    return null;
  }

  return (
    <div
      className="cart-drawer__backdrop"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="cart-drawer"
        onClick={(event) => event.stopPropagation()}
        aria-label="Shopping cart"
      >
        <header className="cart-drawer__header">
          <h2>Your Cart</h2>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={onClose}
            aria-label="Close cart"
          >
            ×
          </button>
        </header>

        <div className="cart-drawer__content">
          {items.length === 0 && (
            <div className="cart-empty">Your cart is empty.</div>
          )}

          {items.map((item) => (
            <article key={item.id} className="cart-line">
              <img
                className="cart-line__img"
                src={item.image}
                alt={item.name || "Cart item"}
              />

              <div className="cart-line__meta">
                <div className="cart-line__name">{item.name}</div>

                <div className="cart-line__price-row">
                  <span className="cart-line__price">
                    ${Number(item.unitPrice || 0).toFixed(2)} each
                  </span>
                  <strong className="cart-line__total">
                    $
                    {(
                      Number(item.unitPrice || 0) *
                      Number(item.qty || 0)
                    ).toFixed(2)}
                  </strong>
                </div>

                <div className="cart-line__controls">
                  <div className="cart-qty" aria-label="Quantity controls">
                    <button
                      type="button"
                      className="cart-qty__btn"
                      onClick={() =>
                        updateQty(item.id, (item.qty || 1) - 1)
                      }
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      −
                    </button>

                    <input
                      className="cart-qty__input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label={`${item.name} quantity`}
                      value={item.qty ?? 1}
                      onChange={(event) =>
                        updateQty(item.id, event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="cart-qty__btn"
                      onClick={() =>
                        updateQty(item.id, (item.qty || 1) + 1)
                      }
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      +
                    </button>
                  </div>

                  {item.maxQuantity && (
                    <span className="cart-line__stock">
                      Max: {item.maxQuantity}
                    </span>
                  )}

                  <button
                    type="button"
                    className="cart-line__remove"
                    onClick={() => remove(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <footer className="cart-drawer__footer">
          <div className="cart-subtotal">
            <span>Subtotal</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>

          <div className="cart-note">
            Tax and shipping are calculated at checkout.
          </div>

          <p className="cart-policy-notice">
            By proceeding to checkout, you acknowledge our purchasing,
            condition, shipping, and return{" "}
            <Link to="/policies" onClick={onClose}>
              policies
            </Link>
            .
          </p>

          <div className="cart-actions">
            <button
              type="button"
              className="btn btn-light"
              onClick={clear}
              disabled={items.length === 0 || isCheckingOut}
            >
              Clear
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={onCheckout}
              disabled={items.length === 0 || isCheckingOut}
            >
              {isCheckingOut ? "Starting..." : "Checkout"}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

export default CartDrawer;
