import React, { useEffect, useRef, useState } from "react";
import "../dropDown.css";

const CLOSE_DELAY_MS = 350;

function CatagoryDropDown({ data = [], onSelect }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    cancelScheduledClose();
    setOpen(true);
  };

  const closeMenu = () => {
    cancelScheduledClose();
    setOpen(false);
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(
    () => () => {
      cancelScheduledClose();
    },
    [],
  );

  const handleSelect = (category) => {
    // Keep the original category object intact. HomeHeader extracts the ID and
    // sends categoryId to the shared Browse search endpoint.
    onSelect?.(category);
    closeMenu();
  };

  const handleButtonClick = () => {
    cancelScheduledClose();
    setOpen((current) => !current);
  };

  return (
    <div
      ref={containerRef}
      className="dropdown"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          scheduleClose();
        }
      }}
    >
      <button
        type="button"
        className="dropbtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="category-filter-menu"
        onClick={handleButtonClick}
      >
        Categories
      </button>

      {open && (
        <div
          id="category-filter-menu"
          className="dropdown-content"
          role="menu"
          aria-label="Categories"
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
        >
          {data.map((category, index) => {
            const categoryId =
              category?.id ??
              category?.Id ??
              category?.catagoryId ??
              category?.CatagoryId ??
              index;
            const categoryName =
              category?.name ??
              category?.Name ??
              category?.catagoryName ??
              category?.CatagoryName ??
              "Unnamed category";

            return (
              <button
                type="button"
                role="menuitem"
                key={categoryId}
                onClick={() => handleSelect(category)}
              >
                {categoryName}
              </button>
            );
          })}

          {data.length === 0 && (
            <span className="dropdown-empty">No categories available</span>
          )}
        </div>
      )}
    </div>
  );
}

export default CatagoryDropDown;
