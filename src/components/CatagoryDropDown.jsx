import React, { useState } from "react";
import "../dropDown.css";

function CatagoryDropDown({ data = [], onSelect }) {
  const [open, setOpen] = useState(false);

  const handleClick = (e, cat) => {
    e.preventDefault();
    if (onSelect) {
      onSelect(cat);
    }
  };

  return (
    <div>
      <div
        className="dropdown"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button className="dropbtn">Category</button>
        {open && (
          <div className="dropdown-content">
            {data.map((cat, idx) => (
              <a
                key={cat.id ?? idx}
                href="#"
                onClick={(e) => handleClick(e, cat)}
              >
                {cat.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CatagoryDropDown;
