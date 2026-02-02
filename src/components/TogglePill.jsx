import React from "react";

function TogglePill({ on, onClick, children, disabled = false }) {
  return (
    <button
      type="button"
      className={`apd-pill ${on ? "apd-pill--on" : "apd-pill--off"} ${
        disabled ? "apd-pill--disabled" : ""
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

export default TogglePill;
