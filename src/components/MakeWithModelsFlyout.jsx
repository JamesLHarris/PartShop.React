import React, { useEffect, useMemo, useRef, useState } from "react";
import modelService from "../service/modelService";
import "./HomeHeader.css";

const idOf = (item) => item?.id ?? item?.Id;
const companyOf = (item) => item?.company ?? item?.Company ?? "";
const nameOf = (item) => item?.name ?? item?.Name ?? "";

export default function MakeWithModelsFlyout({
  makes = [],
  onSelectMake,
  onSelectModel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMakeId, setActiveMakeId] = useState("");
  const [modelsByMakeId, setModelsByMakeId] = useState({});
  const [loadingMakeId, setLoadingMakeId] = useState("");
  const [errorsByMakeId, setErrorsByMakeId] = useState({});

  const containerRef = useRef(null);
  const closeTimer = useRef(null);
  const pendingMakeIds = useRef(new Set());
  const isMountedRef = useRef(true);

  const companyMakes = useMemo(() => {
    const seenCompanies = new Set();

    return (makes || []).filter((make) => {
      const company = companyOf(make).trim().toLowerCase();
      if (!company || seenCompanies.has(company)) return false;
      seenCompanies.add(company);
      return true;
    });
  }, [makes]);

  const activeMake = useMemo(
    () =>
      companyMakes.find(
        (make) => String(idOf(make)) === String(activeMakeId),
      ) ?? companyMakes[0] ?? null,
    [companyMakes, activeMakeId],
  );

  const activeKey = activeMake ? String(idOf(activeMake)) : "";
  const activeModels = activeKey ? modelsByMakeId[activeKey] ?? [] : [];
  const activeError = activeKey ? errorsByMakeId[activeKey] ?? "" : "";
  const isLoadingModels = Boolean(activeKey && loadingMakeId === activeKey);

  const loadModels = (makeId) => {
    const key = String(makeId || "");

    if (
      !key ||
      Object.prototype.hasOwnProperty.call(modelsByMakeId, key) ||
      pendingMakeIds.current.has(key)
    ) {
      return;
    }

    pendingMakeIds.current.add(key);
    setLoadingMakeId(key);
    setErrorsByMakeId((previous) => ({ ...previous, [key]: "" }));

    modelService
      .getAllModelsByMakeId(makeId)
      .then((response) => {
        if (!isMountedRef.current) return;

        setModelsByMakeId((previous) => ({
          ...previous,
          [key]: Array.isArray(response?.item) ? response.item : [],
        }));
      })
      .catch((error) => {
        if (!isMountedRef.current) return;

        console.error(`Failed to load models for make ${makeId}.`, error);
        setModelsByMakeId((previous) => ({ ...previous, [key]: [] }));
        setErrorsByMakeId((previous) => ({
          ...previous,
          [key]: "Unable to load models.",
        }));
      })
      .finally(() => {
        pendingMakeIds.current.delete(key);

        if (isMountedRef.current) {
          setLoadingMakeId((current) => (current === key ? "" : current));
        }
      });
  };

  useEffect(() => {
    isMountedRef.current = true;

    const handlePointerDown = (event) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);

      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (companyMakes.length === 0) {
      setActiveMakeId("");
      return;
    }

    const activeStillExists = companyMakes.some(
      (make) => String(idOf(make)) === String(activeMakeId),
    );

    if (!activeStillExists) {
      setActiveMakeId(String(idOf(companyMakes[0])));
    }
  }, [companyMakes, activeMakeId]);

  useEffect(() => {
    if (activeMake) {
      loadModels(idOf(activeMake));
    }
    // modelsByMakeId is intentionally omitted so cached updates do not retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }

    setIsOpen(true);

    if (activeMake) {
      loadModels(idOf(activeMake));
    }
  };

  const toggleMenu = () => {
    setIsOpen((current) => {
      const next = !current;
      if (next && activeMake) {
        loadModels(idOf(activeMake));
      }
      return next;
    });
  };

  const handleButtonClick = () => {
    const supportsHover =
      typeof window !== "undefined" &&
      window.matchMedia?.("(hover: hover)").matches;

    if (supportsHover) {
      openMenu();
      return;
    }

    toggleMenu();
  };

  const scheduleCloseMenu = () => {
    closeTimer.current = setTimeout(() => {
      setIsOpen(false);
    }, 140);
  };

  const activateMake = (make) => {
    const makeId = idOf(make);
    setActiveMakeId(String(makeId));
    loadModels(makeId);
  };

  const selectMake = (make) => {
    onSelectMake?.(make);
    setIsOpen(false);
  };

  const selectModel = (model) => {
    if (!activeMake) return;

    onSelectModel?.(activeMake, model);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="make-dd make-dd--controlled"
      data-test="make-flyout"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleCloseMenu}
    >
      <button
        type="button"
        className="make-dd__btn"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="make-model-menu"
        onClick={handleButtonClick}
      >
        Make / Model
      </button>

      {isOpen && (
        <div id="make-model-menu" className="make-dd__panel">
          <ul className="make-dd__menu" aria-label="Makes">
            {companyMakes.map((make) => {
              const makeId = String(idOf(make));

              return (
                <li key={makeId} className="make-dd__item">
                  <button
                    type="button"
                    className={`make-dd__link ${
                      makeId === activeKey ? "is-active" : ""
                    }`}
                    onMouseEnter={() => activateMake(make)}
                    onFocus={() => activateMake(make)}
                    onClick={() => selectMake(make)}
                  >
                    {companyOf(make)}
                  </button>
                </li>
              );
            })}

            {companyMakes.length === 0 && (
              <li>
                <span className="make-dd__sublink make-dd__status">
                  No makes available
                </span>
              </li>
            )}
          </ul>

          <ul className="make-dd__submenu" aria-label="Models">
            {isLoadingModels && (
              <li>
                <span className="make-dd__sublink make-dd__status">
                  Loading models…
                </span>
              </li>
            )}

            {!isLoadingModels && activeError && (
              <li>
                <span className="make-dd__sublink make-dd__status" role="alert">
                  {activeError}
                </span>
              </li>
            )}

            {!isLoadingModels &&
              !activeError &&
              activeModels.map((model) => (
                <li key={model?.makeId ?? model?.MakeId ?? idOf(model)}>
                  <button
                    type="button"
                    className="make-dd__sublink"
                    onClick={() => selectModel(model)}
                  >
                    {nameOf(model)}
                  </button>
                </li>
              ))}

            {!isLoadingModels &&
              !activeError &&
              activeMake &&
              activeModels.length === 0 && (
                <li>
                  <span className="make-dd__sublink make-dd__status">
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
