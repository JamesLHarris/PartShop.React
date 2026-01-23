import React from "react";

function TogglePill({ on, onClick, children }) {
  return (
    <button
      type="button"
      className={`apd-pill ${on ? "apd-pill--on" : "apd-pill--off"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default TogglePill;
