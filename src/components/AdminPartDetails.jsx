import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import partsService from "../service/partsService";
import availableService from "../service/availableService";
import "./AdminPartDetails.css";
import InLineNumber from "./InLineNumber";
import InLineSelect from "./InLineSelect";
import InLineText from "./InLineText";
import TogglePill from "./TogglePill";
import LocationModal from "./LocationModal";
import AuditHistory from "./AuditHistory";

function AdminPartDetails() {
  const { id } = useParams();

  // data + ui state
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [edit, setEdit] = useState({
    price: false,
    availability: false,
    desc: false,
  });

  const [availabilityOptions, setAvailabilityOptions] = useState([]); // [{value,label}]

  // location modal stub
  const [locModalOpen, setLocModalOpen] = useState(false);

  // --- fetchers ---
  const onGetSuccess = (response) => {
    setPart(response.item);
    setLoading(false);
  };
  const onError = (err) => {
    console.error("AdminPartDetails error:", err);
    setLoading(false);
  };

  const refresh = () =>
    partsService.getPartById(id).then(onGetSuccess).catch(onError);

  useEffect(() => {
    setLoading(true);
    partsService.getPartById(id).then(onGetSuccess).catch(onError);
  }, [id]);

  useEffect(() => {
    // load availability options once
    availableService
      .getAllAvailabilities()
      .then((res) => {
        // normalize to [{value,label}]
        const raw = res.item?.pagedItems || res.items || res.item || [];
        const opts = raw.map((a) => ({
          value: String(a.id),
          label: a.status || a.name || "",
        }));
        setAvailabilityOptions(opts);
      })
      .catch(onError);
  }, []);

  // --- utils ---
  const fmtPrice = (n) =>
    typeof n === "number"
      ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
      : n;

  const get = (obj, ...keys) =>
    keys.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);

  const buildImageUrl = (img) => {
    if (!img) return "";
    if (/^https?:\/\//i.test(img)) return img;
    return `https://localhost:7274${img.startsWith("/") ? img : `/${img}`}`;
  };

  const patchAndRefresh = async (payload) => {
    try {
      setSaving(true);
      await partsService.patchPart(payload, vm.id); // your service: (payload, id)
      await refresh();
    } catch (e) {
      console.error("PATCH failed", e);
      alert("Update failed. Check console for details.");
    } finally {
      setSaving(false);
      setEdit({ price: false, availability: false, desc: false });
    }
  };

  // --- normalize shape for safe rendering ---
  const vm = useMemo(() => {
    const p = part || {};

    const name = p.name;
    const category = p.catagoryName ?? get(p, "catagory", "name");
    const company = p.company ?? get(p, "make", "company");
    const model = p.modelName ?? get(p, "make", "model", "name");
    const year = p.year;
    const partNumber = p.partnumber ?? p.partNumber;

    const availableStatus = p.availableStatus ?? get(p, "available", "status");
    const availableId = p.availableId ?? get(p, "available", "id");

    const site = p.siteName ?? get(p, "location", "site", "name");
    const area = p.areaName ?? get(p, "location", "area", "name");
    const aisle = p.aisleName ?? get(p, "location", "aisle", "name");
    const shelf = p.shelfName ?? get(p, "location", "shelf", "name");
    const section = p.sectionName ?? get(p, "location", "section", "name");
    const box = p.boxName ?? get(p, "location", "box", "name");

    const price = p.price;
    const rusted = p.rusted;
    const tested = p.tested;
    const lastMovedBy = p.lastMovedBy ?? get(p, "user", "name");
    const dateCreated = p.datecreated ?? p.dateCreated;
    const dateModified = p.datemodified ?? p.dateModified;

    const image = buildImageUrl(p.image);

    return {
      id: p.id,
      name,
      category,
      company,
      model,
      year,
      partNumber,
      availableStatus,
      availableId,
      site,
      area,
      aisle,
      shelf,
      section,
      box,
      price,
      rusted,
      tested,
      lastMovedBy,
      dateCreated,
      dateModified,
      image,
      description: p.description,
      locationId: p.locationId ?? get(p, "location", "id"),
      location: p.location,
    };
  }, [part]);

  // --- handlers (inline editors + toggles) ---
  const onEditPrice = () => setEdit((e) => ({ ...e, price: true }));
  const onChangeAvailability = () =>
    setEdit((e) => ({ ...e, availability: true }));
  const onEditDesc = () => setEdit((e) => ({ ...e, desc: true }));

  const onToggleRusted = () => patchAndRefresh({ rusted: !vm.rusted });
  const onToggleTested = () => patchAndRefresh({ tested: !vm.tested });

  // location modal open/save (wire when modal exists)
  const openLocationModal = () => setLocModalOpen(true);

  const handleLocationSave = async (locationId /*, prettyPath */) => {
    await patchAndRefresh({ locationId });
    setLocModalOpen(false);
  };

  if (loading) return <div className="apd-skeleton" aria-busy="true" />;
  if (!part) return <p>Not found.</p>;

  return (
    <div className="admin-part-details">
      <header className="apd-header">
        <div className="apd-title">
          <h2>{vm.name}</h2>
          {vm.availableStatus && (
            <span
              className={`apd-badge ${
                vm.availableStatus === "Available"
                  ? "apd-badge--available"
                  : vm.availableStatus === "Unavailable"
                  ? "apd-badge--unavailable"
                  : vm.availableStatus === "Pending"
                  ? "apd-badge--pending"
                  : ""
              }`}
            >
              {vm.availableStatus}
            </span>
          )}
        </div>
        <div className="apd-subtle">
          ID #{vm.id}
          {vm.dateModified
            ? ` • Updated ${new Date(vm.dateModified).toLocaleDateString()}`
            : null}
        </div>
      </header>

      <section className="apd-layout">
        <div className="apd-grid">
          {/* Image / Actions */}
          <aside className="apd-card apd-media">
            {vm.image ? (
              <img src={vm.image} alt={vm.name} className="apd-photo" />
            ) : (
              <div className="apd-photo apd-photo--empty">No Image</div>
            )}
            <div className="apd-actions">
              <button
                type="button"
                className="apd-btn apd-btn--outlined"
                onClick={() => {
                  const path = window.prompt(
                    "Image path or URL:",
                    part?.image || ""
                  );
                  if (path && path.trim())
                    patchAndRefresh({ image: path.trim() });
                }}
                disabled={saving}
              >
                Replace Photo
              </button>
              <a className="apd-btn" href={vm.image} download>
                Download
              </a>
            </div>
          </aside>

          {/* Core Specs */}
          <article className="apd-card apd-specs">
            <h3>Specs</h3>
            <dl className="apd-dl">
              <div>
                <dt>Part #</dt>
                <dd>{vm.partNumber || "—"}</dd>
              </div>
              <div>
                <dt>Year</dt>
                <dd>{vm.year ?? "—"}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{vm.category || "—"}</dd>
              </div>
              <div>
                <dt>Make</dt>
                <dd>{vm.company || "—"}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{vm.model || "—"}</dd>
              </div>
            </dl>
          </article>

          {/* Location */}
          <article className="apd-card apd-location">
            <h3>Location</h3>
            <dl className="apd-dl">
              <div>
                <dt>Site</dt>
                <dd>{vm.site || "—"}</dd>
              </div>
              <div>
                <dt>Area</dt>
                <dd>{vm.area || "—"}</dd>
              </div>
              <div>
                <dt>Aisle</dt>
                <dd>{vm.aisle || "—"}</dd>
              </div>
              <div>
                <dt>Shelf</dt>
                <dd>{vm.shelf || "—"}</dd>
              </div>
              <div>
                <dt>Section</dt>
                <dd>{vm.section || "—"}</dd>
              </div>
              <div>
                <dt>Box</dt>
                <dd>{vm.box || "—"}</dd>
              </div>
              <div>
                <dt>Last Moved</dt>
                <dd>
                  {vm.dateModified
                    ? new Date(vm.dateModified).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Last Moved By</dt>
                <dd>{vm.lastMovedBy || "—"}</dd>
              </div>
            </dl>
            <div className="apd-actions">
              <button
                type="button"
                className="apd-btn apd-btn--outlined"
                onClick={openLocationModal}
                disabled={saving}
              >
                Change Location
              </button>
            </div>
          </article>

          {/* Meta: price, availability, condition, dates, description */}
          <article className="apd-card apd-meta">
            <h3>Meta</h3>
            <dl className="apd-dl">
              {/* Price */}
              <div>
                <dt>Price</dt>
                <dd>
                  {edit.price ? (
                    <InLineNumber
                      value={vm.price}
                      onSubmit={(n) => patchAndRefresh({ price: n })}
                      onCancel={() => setEdit((e) => ({ ...e, price: false }))}
                    />
                  ) : (
                    <>
                      {fmtPrice(vm.price) || "—"}
                      <button
                        className="apd-btn apd-btn--outlined apd-btn--xs"
                        disabled={saving}
                        onClick={() => setEdit((e) => ({ ...e, price: true }))}
                      >
                        Edit
                      </button>
                    </>
                  )}
                </dd>
              </div>

              {/* Availability */}
              <div>
                <dt>Availability</dt>
                <dd>
                  {edit.availability ? (
                    <InLineSelect
                      value={String(vm.availableId ?? "")}
                      options={availabilityOptions}
                      onSubmit={(val) =>
                        patchAndRefresh({ availableId: Number(val) })
                      }
                      onCancel={() =>
                        setEdit((e) => ({ ...e, availability: false }))
                      }
                    />
                  ) : (
                    <>
                      {vm.availableStatus || "—"}
                      <button
                        className="apd-btn apd-btn--outlined apd-btn--xs"
                        disabled={saving}
                        onClick={() =>
                          setEdit((e) => ({ ...e, availability: true }))
                        }
                      >
                        Change
                      </button>
                    </>
                  )}
                </dd>
              </div>

              {/* Rusted / Tested */}
              <div>
                <dt>Rusted</dt>
                <dd>
                  <TogglePill on={!!vm.rusted} onClick={onToggleRusted}>
                    {vm.rusted ? "Yes" : "No"}
                  </TogglePill>
                </dd>
              </div>
              <div>
                <dt>Tested</dt>
                <dd>
                  <TogglePill on={!!vm.tested} onClick={onToggleTested}>
                    {vm.tested ? "Yes" : "No"}
                  </TogglePill>
                </dd>
              </div>

              {/* Date Added */}
              <div>
                <dt>Date Added</dt>
                <dd>
                  {vm.dateCreated
                    ? new Date(vm.dateCreated).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>

            {/* Description */}
            <div className="apd-desc">
              <h4>Description</h4>
              {edit.desc ? (
                <InLineText
                  value={vm.description || ""}
                  onSubmit={(text) => patchAndRefresh({ description: text })}
                  onCancel={() => setEdit((e) => ({ ...e, desc: false }))}
                />
              ) : (
                <>
                  <p className="apd-text">
                    {vm.description || "No description."}
                  </p>
                  <button
                    type="button"
                    className="apd-btn apd-btn--outlined apd-btn--sm"
                    disabled={saving}
                    onClick={onEditDesc}
                  >
                    Change Description
                  </button>
                </>
              )}
            </div>
          </article>
        </div>
        {/* AUDIT HISTORY – right column */}
        <aside className="apd-card apd-audit-column">
          <h3>Audit History</h3>
          <AuditHistory partId={vm.id} pageSize={10} />
        </aside>
      </section>

      {/* When you add the modal component, render it here */}

      <LocationModal
        open={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        onSave={handleLocationSave}
        initial={{
          // pass ids if you have them in vm.location
          siteId: vm.location.site.id,
          areaId: vm.location.area.id,
          aisleId: vm.location.aisle.id,
          shelfId: vm.location.shelf.id,
          sectionId: vm.location.section.id,
          boxId: vm.location.box.id,
        }}
      />
    </div>
  );
}

export default AdminPartDetails;
