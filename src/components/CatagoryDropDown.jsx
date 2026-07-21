import React, { useEffect, useRef, useState } from "react";
import "../dropDown.css";

const CLOSE_DELAY_MS = 350;

function CatagoryDropDown({
  data = [],
  onSelect,
  onOverview,
  isOverviewActive = false,
}) {
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
    onSelect?.(category);
    closeMenu();
  };

  const handleOverview = () => {
    closeMenu();
    onOverview?.();
  };

  const handleToggle = () => {
    cancelScheduledClose();
    setOpen((current) => !current);
  };

  return (
    <div
      ref={containerRef}
      className="dropdown"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          scheduleClose();
        }
      }}
    >
      <div className="category-split-control">
        <button
          type="button"
          className={`dropbtn category-overview-button ${
            isOverviewActive ? "is-active" : ""
          }`}
          onClick={handleOverview}
        >
          Categories
        </button>

        <button
          type="button"
          className="category-menu-toggle"
          aria-label={open ? "Close category menu" : "Open category menu"}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="category-filter-menu"
          onClick={handleToggle}
        >
          <span aria-hidden="true">▾</span>
        </button>
      </div>

      {open && (
        <div
          id="category-filter-menu"
          className="dropdown-content"
          role="menu"
          aria-label="Category filters"
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
        >
          {data.map((category, index) => {
            const categoryId =
              category?.id ??
              category?.Id ??
              category?.categoryId ??
              category?.CategoryId ??
              category?.catagoryId ??
              category?.CatagoryId ??
              index;
            const categoryName =
              category?.name ??
              category?.Name ??
              category?.categoryName ??
              category?.CategoryName ??
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
