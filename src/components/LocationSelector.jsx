import React, { useState, useEffect } from "react";
import siteService from "../service/siteService";
import locationService from "../service/locationService";

function LocationSelector({ onChange }) {
  const [sites, setSites] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);

  const [selected, setSelected] = useState({
    siteId: "",
    areaId: "",
    aisleId: "",
    shelfId: "",
    sectionId: "",
    boxId: "",
  });

  useEffect(() => {
    siteService.getAllSites().then((res) => setSites(res.item));
  }, []);

  useEffect(() => {
    if (selected.siteId) {
      locationService
        .getLocationHierarchyBySiteId(selected.siteId)
        .then((res) => {
          setHierarchy(res.item);
        });
    } else {
      setHierarchy([]);
    }

    setSelected((prev) => ({
      ...prev,
      areaId: "",
      aisleId: "",
      shelfId: "",
      sectionId: "",
      boxId: "",
    }));
  }, [selected.siteId]);

  const updateSelection = (field, value) => {
    const resetBelow = {
      areaId: ["aisleId", "shelfId", "sectionId", "boxId"],
      aisleId: ["shelfId", "sectionId", "boxId"],
      shelfId: ["sectionId", "boxId"],
      sectionId: ["boxId"],
    };

    setSelected((prev) => {
      const updated = { ...prev, [field]: value };
      if (resetBelow[field]) {
        resetBelow[field].forEach((key) => (updated[key] = ""));
      }

      if (onChange) {
        onChange(updated);
      }

      return updated;
    });
  };

  const uniqueOptions = (filterFn, key) => {
    const seen = new Set();
    return hierarchy
      .filter(filterFn)
      .map((row) => {
        const id = row[key]?.id;
        const name = row[key]?.name;
        return { id, name };
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
              (row) => row.site?.id === parseInt(selected.siteId),
              "area"
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
              (row) => row.area?.id === parseInt(selected.areaId),
              "aisle"
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
              (row) => row.aisle?.id === parseInt(selected.aisleId),
              "shelf"
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
              (row) => row.shelf?.id === parseInt(selected.shelfId),
              "section"
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
              (row) => row.section?.id === parseInt(selected.sectionId),
              "box"
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
