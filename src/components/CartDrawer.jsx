import { useCart } from ".//CartContext";
import "./Cart.css";

function CartDrawer({ open, onClose, onCheckout }) {
  const { items, updateQty, remove, subtotal, clear } = useCart();
  if (!open) return null;

  return (
    <div className="cart-drawer__backdrop" onClick={onClose}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="cart-drawer__header">
          <h3>Your Cart</h3>
          <button className="cart-drawer__close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="cart-drawer__content">
          {items.length === 0 && (
            <div className="cart-empty">Your cart is empty.</div>
          )}

          {items.map((it) => (
            <div key={it.id} className="cart-line">
              <img className="cart-line__img" src={it.image} alt={it.name} />
              <div className="cart-line__meta">
                <div className="cart-line__name">{it.name}</div>
                <div className="cart-line__price">
                  ${Number(it.unitPrice || 0).toFixed(2)}
                </div>
                <div className="cart-line__qty">
                  <button className="link" onClick={() => remove(it.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
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
          <div className="cart-actions">
            <button
              className="btn btn-light"
              onClick={clear}
              disabled={items.length === 0}
            >
              Clear
            </button>
            <button
              className="btn btn-primary"
              onClick={onCheckout}
              disabled={items.length === 0}
            >
              Checkout
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

export default CartDrawer;
