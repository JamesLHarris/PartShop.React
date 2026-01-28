import React from "react";
import "./HomeHeader.css";

const idOf = (x) => x?.id ?? x?.Id;
const nameOf = (x) => x?.name ?? x?.Name;
const coOf = (x) => x?.company ?? x?.Company;
const makeIdOfModel = (m) => m?.makeId ?? m?.MakeId;

export default function MakeWithModelsFlyout({
  makes = [],
  modelsAll = [],
  onSelectMake,
  onSelectModel,
}) {
  const modelsForMake = (mk) => {
    const single = mk?.model ?? mk?.Model;
    const many = mk?.models ?? mk?.Models;

    if (Array.isArray(many) && many.length) return many;
    if (single) return [single];

    const mkId = idOf(mk);
    if (!mkId) return [];
    return (modelsAll || []).filter((m) => makeIdOfModel(m) === mkId);
  };

  return (
    <div className="make-dd" data-test="make-flyout">
      <button
        className="make-dd__btn"
        aria-haspopup="true"
        aria-expanded="false"
      >
        Make
      </button>

      <ul className="make-dd__menu">
        {makes.map((mk) => {
          const models = modelsForMake(mk);

          return (
            <li key={idOf(mk)} className="make-dd__item">
              <button
                type="button"
                className="make-dd__link"
                onClick={() => onSelectMake?.(mk)}
              >
                {coOf(mk)}
              </button>

              <ul className="make-dd__submenu">
                {models.map((m) => (
                  <li key={idOf(m)}>
                    <button
                      type="button"
                      className="make-dd__sublink"
                      onClick={() => onSelectModel?.(mk, m)}
                    >
                      {nameOf(m)}
                    </button>
                  </li>
                ))}

                {models.length === 0 && (
                  <li>
                    <span className="make-dd__sublink" style={{ opacity: 0.7 }}>
                      No models
                    </span>
                  </li>
                )}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
