import React, { useState } from "react";
import "../dropDown.css";

function ModelDropDown({ data = [], onSelect }) {
  const [open, setOpen] = useState(false);

  const handleClick = (e, model) => {
    e.preventDefault();
    if (onSelect) {
      onSelect(model);
    }
  };

  return (
    <div>
      <div
        className="dropdown"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button className="dropbtn">Model</button>
        {open && (
          <div className="dropdown-content">
            {data.map((model, idx) => (
              <a
                key={model.id ?? idx}
                href="#"
                onClick={(e) => handleClick(e, model)}
              >
                {model.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModelDropDown;
