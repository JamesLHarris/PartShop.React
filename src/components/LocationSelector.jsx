import React, { useState, useEffect } from "react";
import siteService from "../service/siteService";
import locationService from "../service/locationService";

function LocationSelector({ onChange, initialValue = null }) {
  const [sites, setSites] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);

  const [selected, setSelected] = useState({
    siteId: "",
    areaId: "",
    aisleId: "",
    shelfId: "",
    sectionId: "",
    boxId: "",
    locationId: "",
  });

  useEffect(() => {
    siteService.getAllSites().then((res) => setSites(res.item || []));
  }, []);

  useEffect(() => {
    if (initialValue) {
      setSelected({
        siteId: String(initialValue.siteId || ""),
        areaId: String(initialValue.areaId || ""),
        aisleId: String(initialValue.aisleId || ""),
        shelfId: String(initialValue.shelfId || ""),
        sectionId: String(initialValue.sectionId || ""),
        boxId: String(initialValue.boxId || ""),
        locationId: String(initialValue.locationId || ""),
      });
    }
  }, [initialValue]);

  useEffect(() => {
    if (selected.siteId) {
      locationService
        .getLocationHierarchyBySiteId(selected.siteId)
        .then((res) => {
          setHierarchy(res.item || []);
        });
    } else {
      setHierarchy([]);
    }
  }, [selected.siteId]);

  const getId = (row, flatKey, nestedKey) =>
    String(row?.[flatKey] ?? row?.[nestedKey]?.id ?? "");

  const resolveLocationId = (state) => {
    const match = hierarchy.find((row) => {
      return (
        getId(row, "siteId", "site") === String(state.siteId || "") &&
        getId(row, "areaId", "area") === String(state.areaId || "") &&
        getId(row, "aisleId", "aisle") === String(state.aisleId || "") &&
        getId(row, "shelfId", "shelf") === String(state.shelfId || "") &&
        getId(row, "sectionId", "section") === String(state.sectionId || "") &&
        getId(row, "boxId", "box") === String(state.boxId || "")
      );
    });

    return String(
      match?.locationId ??
        match?.LocationId ??
        match?.id ??
        match?.Id ??
        match?.location?.id ??
        "",
    );
  };

  const updateSelection = (field, value) => {
    const resetBelow = {
      siteId: [
        "areaId",
        "aisleId",
        "shelfId",
        "sectionId",
        "boxId",
        "locationId",
      ],
      areaId: ["aisleId", "shelfId", "sectionId", "boxId", "locationId"],
      aisleId: ["shelfId", "sectionId", "boxId", "locationId"],
      shelfId: ["sectionId", "boxId", "locationId"],
      sectionId: ["boxId", "locationId"],
      boxId: ["locationId"],
    };

    setSelected((prev) => {
      const updated = { ...prev, [field]: value };

      if (resetBelow[field]) {
        resetBelow[field].forEach((key) => {
          updated[key] = "";
        });
      }

      if (field === "boxId" && value) {
        updated.locationId = resolveLocationId(updated);
      }

      onChange?.(updated);
      return updated;
    });
  };

  const uniqueOptions = (filterFn, key) => {
    const seen = new Set();

    return hierarchy
      .filter(filterFn)
      .map((row) => {
        const node =
          row[key] ||
          (key === "site"
            ? { id: row.siteId, name: row.siteName }
            : key === "area"
              ? { id: row.areaId, name: row.areaName }
              : key === "aisle"
                ? { id: row.aisleId, name: row.aisleName }
                : key === "shelf"
                  ? { id: row.shelfId, name: row.shelfName }
                  : key === "section"
                    ? { id: row.sectionId, name: row.sectionName }
                    : key === "box"
                      ? { id: row.boxId, name: row.boxName }
                      : null);

        return {
          id: node?.id,
          name: node?.name,
        };
      })
      .filter((opt) => opt.id && !seen.has(opt.id) && seen.add(opt.id));
  };

  return (
    <>
      <label>Site:</label>
      <select
        value={selected.siteId}
        onChange={(e) => updateSelection("siteId", e.target.value)}
      >
        <option value="">Select Site</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {selected.siteId && (
        <>
          <label>Area:</label>
          <select
            value={selected.areaId}
            onChange={(e) => updateSelection("areaId", e.target.value)}
          >
            <option value="">Select Area</option>
            {uniqueOptions(
              (row) =>
                String(row.siteId || row.site?.id || "") ===
                String(selected.siteId),
              "area",
            ).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </>
      )}

      {selected.areaId && (
        <>
          <label>Aisle:</label>
          <select
            value={selected.aisleId}
            onChange={(e) => updateSelection("aisleId", e.target.value)}
          >
            <option value="">Select Aisle</option>
            {uniqueOptions(
              (row) =>
                String(row.areaId || row.area?.id || "") ===
                String(selected.areaId),
              "aisle",
            ).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </>
      )}

      {selected.aisleId && (
        <>
          <label>Shelf:</label>
          <select
            value={selected.shelfId}
            onChange={(e) => updateSelection("shelfId", e.target.value)}
          >
            <option value="">Select Shelf</option>
            {uniqueOptions(
              (row) =>
                String(row.aisleId || row.aisle?.id || "") ===
                String(selected.aisleId),
              "shelf",
            ).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </>
      )}

      {selected.shelfId && (
        <>
          <label>Section:</label>
          <select
            value={selected.sectionId}
            onChange={(e) => updateSelection("sectionId", e.target.value)}
          >
            <option value="">Select Section</option>
            {uniqueOptions(
              (row) =>
                String(row.shelfId || row.shelf?.id || "") ===
                String(selected.shelfId),
              "section",
            ).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </>
      )}

      {selected.sectionId && (
        <>
          <label>Box:</label>
          <select
            value={selected.boxId}
            onChange={(e) => updateSelection("boxId", e.target.value)}
          >
            <option value="">Select Box</option>
            {uniqueOptions(
              (row) =>
                String(row.sectionId || row.section?.id || "") ===
                String(selected.sectionId),
              "box",
            ).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </>
      )}
    </>
  );
}

export default LocationSelector;
