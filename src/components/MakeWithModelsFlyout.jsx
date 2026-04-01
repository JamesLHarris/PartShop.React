import React, { useEffect, useMemo, useRef, useState } from "react";
import "./HomeHeader.css";

const idOf = (x) => x?.id ?? x?.Id;
const nameOf = (x) => x?.name ?? x?.Name;
const coOf = (x) => x?.company ?? x?.Company ?? "";

export default function MakeWithModelsFlyout({
  makes = [],
  onSelectMake,
  onSelectModel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState("");
  const closeTimer = useRef(null);

  const groupedMakes = useMemo(() => {
    const map = new Map();

    (makes || []).forEach((row) => {
      const company = coOf(row)?.trim();
      const model = row?.model ?? row?.Model;

      if (!company) return;

      if (!map.has(company)) {
        map.set(company, {
          company,
          rows: [],
          models: [],
        });
      }

      const group = map.get(company);
      group.rows.push(row);

      if (model) {
        const modelId = idOf(model);
        const exists = group.models.some((m) => idOf(m) === modelId);
        if (!exists) {
          group.models.push(model);
        }
      }
    });

    return Array.from(map.values());
  }, [makes]);

  useEffect(() => {
    if (!activeCompany && groupedMakes.length > 0) {
      setActiveCompany(groupedMakes[0].company);
    }
  }, [groupedMakes, activeCompany]);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    setIsOpen(true);

    if (!activeCompany && groupedMakes.length > 0) {
      setActiveCompany(groupedMakes[0].company);
    }
  };

  const closeMenu = () => {
    closeTimer.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  const activeGroup =
    groupedMakes.find((g) => g.company === activeCompany) ??
    groupedMakes[0] ??
    null;

  return (
    <div
      className="make-dd make-dd--controlled"
      data-test="make-flyout"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
    >
      <button
        type="button"
        className="make-dd__btn"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        Make
      </button>

      {isOpen && (
        <div className="make-dd__panel">
          <ul className="make-dd__menu">
            {groupedMakes.map((group) => (
              <li key={group.company} className="make-dd__item">
                <button
                  type="button"
                  className={`make-dd__link ${
                    group.company === activeCompany ? "is-active" : ""
                  }`}
                  onMouseEnter={() => setActiveCompany(group.company)}
                  onClick={() => onSelectMake?.(group.rows[0])}
                >
                  {group.company}
                </button>
              </li>
            ))}
          </ul>

          <ul className="make-dd__submenu make-dd__submenu--open">
            {activeGroup?.models?.map((model) => (
              <li key={idOf(model) ?? nameOf(model)}>
                <button
                  type="button"
                  className="make-dd__sublink"
                  onClick={() => onSelectModel?.(activeGroup.rows[0], model)}
                >
                  {nameOf(model)}
                </button>
              </li>
            ))}

            {!activeGroup?.models?.length && (
              <li>
                <span className="make-dd__sublink" style={{ opacity: 0.7 }}>
                  No models
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
