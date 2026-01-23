import React, { useEffect, useMemo, useState } from "react";
import locationService from "../service/locationService";

function LocationModal(props) {
  const open = props.open;
  const onSave = props.onSave;
  const onClose = props.onClose;

  const toId = (v) => (v == null ? "" : String(v));
  const eqId = (a, b) => String(a) === String(b);

  const [loading, setLoading] = useState(false);

  // Selection state (strings recommended for <select>)
  const [siteId, setSiteId] = useState(toId(props.initial.siteId));
  const [areaId, setAreaId] = useState(toId(props.initial.areaId));
  const [aisleId, setAisleId] = useState(toId(props.initial.aisleId));
  const [shelfId, setShelfId] = useState(toId(props.initial.shelfId));
  const [sectionId, setSectionId] = useState(toId(props.initial.sectionId));
  const [boxId, setBoxId] = useState(toId(props.initial.boxId));

  // The hierarchy tree for the selected site
  const [hier, setHier] = useState(null);

  // If you already have a Site picker elsewhere, you can populate this from there.
  // For now we just use the initial site and don’t render a site select.
  useEffect(() => {
    if (!open) return;

    // seed current selections every time the modal opens
    setSiteId(props.initial.siteId ?? "");
    setAreaId(props.initial.areaId ?? "");
    setAisleId(props.initial.aisleId ?? "");
    setShelfId(props.initial.shelfId ?? "");
    setSectionId(props.initial.sectionId ?? "");
    setBoxId(props.initial.boxId ?? "");
  }, [open]); // eslint-disable-line

  // Fetch the hierarchy whenever siteId is present (modal open)
  useEffect(() => {
    if (!open || !siteId) {
      setHier(null);
      return;
    }
    setLoading(true);
    locationService
      .getLocationHierarchyBySiteId(siteId)
      .then((res) => {
        const rows = res?.item ?? res?.data?.item ?? [];
        const root = buildHierarchyFromRows(rows);
        setHier(root);

        // re-validate selections against new tree
        setAreaId((prev) =>
          root?.areas?.some((a) => eqId(a.id, prev)) ? prev : ""
        );
        const area = root?.areas?.find((a) => eqId(a.id, areaId));
        setAisleId((prev) =>
          area?.aisles?.some((ax) => eqId(ax.id, prev)) ? prev : ""
        );
        const aisle = area?.aisles?.find((ax) => eqId(ax.id, aisleId));
        setShelfId((prev) =>
          aisle?.shelves?.some((s) => eqId(s.id, prev)) ? prev : ""
        );
        const shelf = aisle?.shelves?.find((s) => eqId(s.id, shelfId));
        setSectionId((prev) =>
          shelf?.sections?.some((sx) => eqId(sx.id, prev)) ? prev : ""
        );
        const section = shelf?.sections?.find((sx) => eqId(sx.id, sectionId));
        setBoxId((prev) =>
          section?.boxes?.some((b) => eqId(b.id, prev)) ? prev : ""
        );
      })
      .finally(() => setLoading(false));
  }, [open, siteId]); // <-- only these

  function buildHierarchyFromRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const toId = (v) => (v == null ? "" : String(v));
    const toMaybeId = (v) =>
      v == null || v === "" || v === 0 || v === "0" ? "" : String(v);
    const firstNonEmpty = (...vals) => {
      for (const v of vals) {
        const x = toMaybeId(v);
        if (x !== "") return x;
      }
      return "";
    };

    // support both nested and flat shapes
    const S = rows[0];
    const siteId = S?.site?.id ?? S?.SiteId;
    const siteName = S?.site?.name ?? S?.SiteName;

    const root = { id: toId(siteId), name: siteName ?? "", areas: [] };

    const areaMap = new Map();

    for (const r of rows) {
      const area = r.area ?? { id: r.AreaId, name: r.AreaName };
      const aisle = r.aisle ?? { id: r.AisleId, name: r.AisleName };
      const shelf = r.shelf ?? { id: r.ShelfId, name: r.ShelfName };
      const section = r.section ?? { id: r.SectionId, name: r.SectionName };
      const box = r.box ?? { id: r.BoxId, name: r.BoxName };

      if (!area?.id) continue;

      // pull a LocationId from any plausible field
      const rowLocationId = firstNonEmpty(
        r.locationId,
        r.LocationId,
        r.location?.id,
        r.Location?.Id,
        r.box?.locationId,
        r.box?.LocationId,
        r.box?.location?.id,
        r.Id,
        r.id // many APIs expose Location as Id
      );

      // Area
      const aId = toId(area.id);
      let areaNode = areaMap.get(aId);
      if (!areaNode) {
        areaNode = { id: aId, name: area.name ?? "", aisles: [] };
        areaNode._aisleMap = new Map();
        areaMap.set(aId, areaNode);
        root.areas.push(areaNode);
      }

      // Aisle
      if (aisle?.id) {
        const axId = toId(aisle.id);
        let aisleNode = areaNode._aisleMap.get(axId);
        if (!aisleNode) {
          aisleNode = { id: axId, name: aisle.name ?? "", shelves: [] };
          aisleNode._shelfMap = new Map();
          areaNode._aisleMap.set(axId, aisleNode);
          areaNode.aisles.push(aisleNode);
        }

        // Shelf
        if (shelf?.id) {
          const shId = toId(shelf.id);
          let shelfNode = aisleNode._shelfMap.get(shId);
          if (!shelfNode) {
            shelfNode = { id: shId, name: shelf.name ?? "", sections: [] };
            shelfNode._sectionMap = new Map();
            aisleNode._shelfMap.set(shId, shelfNode);
            aisleNode.shelves.push(shelfNode);
          }

          // Section
          if (section?.id) {
            const seId = toId(section.id);
            let sectionNode = shelfNode._sectionMap.get(seId);
            if (!sectionNode) {
              sectionNode = { id: seId, name: section.name ?? "", boxes: [] };
              sectionNode._boxMap = new Map(); // map so we can merge duplicates and keep locationId
              shelfNode._sectionMap.set(seId, sectionNode);
              shelfNode.sections.push(sectionNode);
            }

            // Box (merge if we’ve seen it)
            if (box?.id) {
              const bId = toId(box.id);
              let boxNode = sectionNode._boxMap.get(bId);
              if (!boxNode) {
                boxNode = {
                  id: bId,
                  name: box.name ?? "",
                  locationId: rowLocationId, // <- carry LocationId onto the box
                };
                sectionNode._boxMap.set(bId, boxNode);
                sectionNode.boxes.push(boxNode);
              } else if (!boxNode.locationId && rowLocationId) {
                // keep first non-empty locationId we encounter
                boxNode.locationId = rowLocationId;
              }
            }
          }
        }
      }
    }

    // cleanup internal maps
    const strip = (n) => {
      delete n._aisleMap;
      delete n._shelfMap;
      delete n._sectionMap;
      delete n._boxMap;
      n.aisles?.forEach(strip);
      n.shelves?.forEach(strip);
      n.sections?.forEach(strip);
    };
    root.areas.forEach(strip);
    return root;
  }

  // Derive options from the current tree + selections

  const areaOptions = useMemo(() => hier?.areas ?? [], [hier]);

  const aisleOptions = useMemo(() => {
    const area = hier?.areas?.find((a) => eqId(a.id, areaId));
    return area?.aisles ?? [];
  }, [hier, areaId]);

  const shelfOptions = useMemo(() => {
    const area = hier?.areas?.find((a) => eqId(a.id, areaId));
    const aisle = area?.aisles?.find((ax) => eqId(ax.id, aisleId));
    return aisle?.shelves ?? [];
  }, [hier, areaId, aisleId]);

  const sectionOptions = useMemo(() => {
    const area = hier?.areas?.find((a) => eqId(a.id, areaId));
    const aisle = area?.aisles?.find((ax) => eqId(ax.id, aisleId));
    const shelf = aisle?.shelves?.find((s) => eqId(s.id, shelfId));
    return shelf?.sections ?? [];
  }, [hier, areaId, aisleId, shelfId]);

  const boxOptions = useMemo(() => {
    const area = hier?.areas?.find((a) => eqId(a.id, areaId));
    const aisle = area?.aisles?.find((ax) => eqId(ax.id, aisleId));
    const shelf = aisle?.shelves?.find((s) => eqId(s.id, shelfId));
    const section = shelf?.sections?.find((sx) => eqId(sx.id, sectionId));
    return section?.boxes ?? [];
  }, [hier, areaId, aisleId, shelfId, sectionId]);

  const area = hier?.areas?.find((a) => eqId(a.id, areaId));
  const aisle = area?.aisles?.find((ax) => eqId(ax.id, aisleId));
  const shelf = aisle?.shelves?.find((s) => eqId(s.id, shelfId));
  const section = shelf?.sections?.find((sx) => eqId(sx.id, sectionId));
  const box = section?.boxes?.find((b) => eqId(b.id, boxId));

  console.log("picked box", box); // should show { id, name, locationId: "123" }

  // When changing a level, clear all lower selections

  const changeArea = (v) => {
    setAreaId(v);
    setAisleId("");
    setShelfId("");
    setSectionId("");
    setBoxId("");
  };
  const changeAisle = (v) => {
    setAisleId(v);
    setShelfId("");
    setSectionId("");
    setBoxId("");
  };
  const changeShelf = (v) => {
    setShelfId(v);
    setSectionId("");
    setBoxId("");
  };
  const changeSection = (v) => {
    setSectionId(v);
    setBoxId("");
  };

  const disabled =
    !siteId || !areaId || !aisleId || !shelfId || !sectionId || !boxId;

  const save = async () => {
    // find selected nodes in the tree
    const area = hier?.areas?.find((a) => eqId(a.id, areaId));
    const aisle = area?.aisles?.find((ax) => eqId(ax.id, aisleId));
    const shelf = aisle?.shelves?.find((s) => eqId(s.id, shelfId));
    const section = shelf?.sections?.find((sx) => eqId(sx.id, sectionId));
    const box = section?.boxes?.find((b) => eqId(b.id, boxId));

    // accept multiple casings/locations for the id
    const firstNonEmpty = (...vals) => {
      for (const v of vals) {
        if (v != null && v !== "" && v !== 0 && v !== "0") return v;
      }
      return "";
    };

    let locIdStr = firstNonEmpty(
      box?.locationId,
      box?.LocationId,
      box?.location?.id,
      box?.Location?.Id
    );

    // Optional fallback resolver (kept if some rows don’t carry an id)
    if (!locIdStr && locationService.resolveLocation) {
      const payload = {
        siteId: parseInt(siteId, 10),
        areaId: parseInt(areaId, 10),
        aisleId: parseInt(aisleId, 10),
        shelfId: parseInt(shelfId, 10),
        sectionId: parseInt(sectionId, 10),
        boxId: parseInt(boxId, 10),
      };
      const { item, data } = await locationService.resolveLocation(payload);
      locIdStr = item?.id ?? data?.item?.id ?? "";
    }

    if (!locIdStr) {
      alert("Could not resolve LocationId for the selected path.");
      return;
    }

    const locationId = parseInt(locIdStr, 10);

    const prettyPath = [
      hier?.name || "",
      area?.name,
      aisle?.name,
      shelf?.name,
      section?.name,
      box?.name,
    ]
      .filter(Boolean)
      .join(" › ");

    // Pass the numeric id up to the parent so it can PATCH
    onSave(locationId, prettyPath, {
      siteId: parseInt(siteId, 10),
      areaId: parseInt(areaId, 10),
      aisleId: parseInt(aisleId, 10),
      shelfId: parseInt(shelfId, 10),
      sectionId: parseInt(sectionId, 10),
      boxId: parseInt(boxId, 10),
    });
  };

  if (!open) return null;

  return (
    <div
      className="lp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lp-title"
    >
      <div className="lp-modal">
        <header className="lp-header">
          <h3 id="lp-title">Change Location</h3>
          <button className="lp-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="lp-body">
          {/* If you want to allow changing Site here, add a site <select>.
              Otherwise, you can render site as read-only text and rely on initial.siteId */}

          <div className="lp-row">
            <label>Area</label>
            <select
              value={areaId}
              onChange={(e) => changeArea(e.target.value)}
              disabled={loading || !hier}
            >
              <option value="">Select area…</option>
              {areaOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lp-row">
            <label>Aisle</label>
            <select
              value={aisleId}
              onChange={(e) => changeAisle(e.target.value)}
              disabled={!areaId || loading}
            >
              <option value="">Select aisle…</option>
              {aisleOptions.map((ax) => (
                <option key={ax.id} value={ax.id}>
                  {ax.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lp-row">
            <label>Shelf</label>
            <select
              value={shelfId}
              onChange={(e) => changeShelf(e.target.value)}
              disabled={!aisleId || loading}
            >
              <option value="">Select shelf…</option>
              {shelfOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lp-row">
            <label>Section</label>
            <select
              value={sectionId}
              onChange={(e) => changeSection(e.target.value)}
              disabled={!shelfId || loading}
            >
              <option value="">Select section…</option>
              {sectionOptions.map((sx) => (
                <option key={sx.id} value={sx.id}>
                  {sx.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lp-row">
            <label>Box</label>
            <select
              value={boxId}
              onChange={(e) => setBoxId(e.target.value)}
              disabled={!sectionId || loading}
            >
              <option value="">Select box…</option>
              {boxOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <footer className="lp-footer">
          <button
            className="apd-btn apd-btn--outlined"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="apd-btn"
            onClick={save}
            disabled={loading || disabled}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

export default LocationModal;
