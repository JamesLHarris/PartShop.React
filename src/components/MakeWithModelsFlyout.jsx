import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomeHeader.css";

const idOf = (x) => x?.id ?? x?.Id;
const nameOf = (x) => x?.name ?? x?.Name;
const coOf = (x) => x?.company ?? x?.Company;

export default function MakeWithModelsFlyout({ makes = [], modelsAll = [] }) {
  const navigate = useNavigate();

  const modelsForMake = (mk) => {
    // Supports either Make.Model (single) or Make.Models (array)
    const single = mk?.model ?? mk?.Model;
    const many = mk?.models ?? mk?.Models;

    if (Array.isArray(many) && many.length) return many;
    if (single) return [single];

    // Fallback so UI still works even if relation is missing
    return modelsAll;
  };

  const goMake = (mk) =>
    navigate(`/search?makeId=${encodeURIComponent(idOf(mk))}`);
  const goModel = (mk, m) =>
    navigate(
      `/search?makeId=${encodeURIComponent(
        idOf(mk)
      )}&modelId=${encodeURIComponent(idOf(m))}`
    );

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
        {makes.map((mk) => (
          <li key={idOf(mk)} className="make-dd__item">
            <button className="make-dd__link" onClick={() => goMake(mk)}>
              {coOf(mk)}
            </button>

            <ul className="make-dd__submenu">
              {modelsForMake(mk).map((m) => (
                <li key={idOf(m)}>
                  <button
                    className="make-dd__sublink"
                    onClick={() => goModel(mk, m)}
                  >
                    {nameOf(m)}
                  </button>
                </li>
              ))}
              {modelsForMake(mk).length === 0 && (
                <li>
                  <span className="make-dd__sublink" style={{ opacity: 0.7 }}>
                    No models
                  </span>
                </li>
              )}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
