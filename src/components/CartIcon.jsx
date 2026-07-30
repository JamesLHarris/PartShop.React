import { useCart } from "./CartContext";
import "./Cart.css";

function CartIcon({ onClick }) {
  const { count } = useCart();

  return (
    <button
      type="button"
      className="cart-icon"
      onClick={onClick}
      aria-label="Open checkout cart"
    >
      <svg
        className="cart-icon__glyph"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M3 4h2l2.25 10.25a2 2 0 0 0 1.95 1.57h7.92a2 2 0 0 0 1.94-1.52L21 7H7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="20" r="1.25" fill="currentColor" />
        <circle cx="18" cy="20" r="1.25" fill="currentColor" />
      </svg>
      <span className="cart-icon__label">Checkout</span>
      {count > 0 && <span className="cart-icon__badge">{count}</span>}
    </button>
  );
}

export default CartIcon;
