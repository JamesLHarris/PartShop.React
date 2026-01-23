import { useCart } from "./CartContext";
import "./Cart.css";

function CartIcon({ onClick }) {
  const { count } = useCart();
  return (
    <button className="cart-icon" onClick={onClick} aria-label="Open cart">
      <span className="cart-icon__glyph">🛒</span>
      {count > 0 && <span className="cart-icon__badge">{count}</span>}
    </button>
  );
}

export default CartIcon;
