import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import toastr from "toastr";
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
  const [auditRefreshToken, setAuditRefreshToken] = useState(0);

  // images
  const [images, setImages] = useState([]);
  const [activeImage, setActiveImage] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);

  // Ref lock prevents ultra-fast multi-click PATCH spam before state re-render
  const saveLockRef = useRef(false);

  const [edit, setEdit] = useState({
    price: false,
    quantity: false,
    availability: false,
    desc: false,
  });

  const [availabilityOptions, setAvailabilityOptions] = useState([]); // [{value,label}]
  const [locModalOpen, setLocModalOpen] = useState(false);

  // --- fetchers ---
  const onGetSuccess = (response) => {
    setPart(response.item);
    setLoading(false);
  };

  const onError = (err) => {
    console.error("AdminPartDetails error:", err);
    setLoading(false);

    const msg =
      err?.response?.data?.errors?.[0] ||
      err?.response?.data?.error ||
      "Failed to load part.";
    toastr.error(msg);
  };

  const refresh = () =>
    partsService.getPartById(id).then(onGetSuccess).catch(onError);

  const refreshImages = () =>
    partsService
      .getPartImagesByPartId(id)
      .then((res) => {
        const list = res?.item || [];
        setImages(list);
        const primary = list.find((x) => x.isPrimary) || list[0];
        setActiveImage(primary?.url ? buildImageUrl(primary.url) : "");
      })
      .catch(() => {
        setImages([]);
        setActiveImage("");
      });

  useEffect(() => {
    setLoading(true);
    partsService.getPartById(id).then(onGetSuccess).catch(onError);
    refreshImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // load availability options once
    availableService
      .getAllAvailabilities()
      .then((res) => {
        const raw = res.item?.pagedItems || res.items || res.item || [];
        const opts = raw.map((a) => ({
          value: String(a.id),
          label: a.status || a.name || "",
        }));
        setAvailabilityOptions(opts);
      })
      .catch(onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- utils ---
  const fmtPrice = (n) =>
    typeof n === "number"
      ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
      : n;

  const get = (obj, ...keys) =>
    keys.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);

  function buildImageUrl(img) {
    if (!img) return "";
    if (/^https?:\/\//i.test(img)) return img;
    return `https://localhost:7274${img.startsWith("/") ? img : `/${img}`}`;
  }

  const showApiError = (err, fallback = "Update failed.") => {
    const msg =
      err?.response?.data?.errors?.[0] ||
      err?.response?.data?.error ||
      fallback;
    toastr.error(msg);
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
      rawImage: p.image || "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  // Harden modal initial values (prevents crashes on missing nested objects)
  const initialLocation = {
    siteId: get(vm, "location", "site", "id") ?? null,
    areaId: get(vm, "location", "area", "id") ?? null,
    aisleId: get(vm, "location", "aisle", "id") ?? null,
    shelfId: get(vm, "location", "shelf", "id") ?? null,
    sectionId: get(vm, "location", "section", "id") ?? null,
    boxId: get(vm, "location", "box", "id") ?? null,
  };

  // --- PATCH with lock (prevents rapid click spam across toggles, etc.) ---
  const patchAndRefresh = async (payload) => {
    // Ultra-fast double-click protection
    if (saveLockRef.current) return;

    // Basic guard
    if (!payload || typeof payload !== "object") return;

    saveLockRef.current = true;
    setSaving(true);

    try {
      await partsService.patchPart(payload, vm.id); // your service: (payload, id)
      toastr.success("Saved.");
      await refresh();
      setAuditRefreshToken((t) => t + 1);
    } catch (e) {
      console.error("PATCH failed", e);
      showApiError(e, "Update failed.");
    } finally {
      setSaving(false);
      saveLockRef.current = false;
      setEdit({
        price: false,
        quantity: false,
        availability: false,
        desc: false,
      });
    }
  };

  // --- handlers (inline editors + toggles) ---
  const onToggleRusted = () => {
    if (saving) return;
    patchAndRefresh({ rusted: !vm.rusted });
  };

  const onToggleTested = () => {
    if (saving) return;
    patchAndRefresh({ tested: !vm.tested });
  };

  const openLocationModal = () => {
    if (saving) return;
    setLocModalOpen(true);
  };

  const handleLocationSave = async (locationId) => {
    await patchAndRefresh({ locationId });
    setLocModalOpen(false);
  };

  if (loading) return <div className="apd-skeleton" aria-busy="true" />;
  if (!part) return <p>Not found.</p>;

  const galleryMain = activeImage || vm.image;

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
          {saving ? " • Saving…" : null}
        </div>
      </header>

      <section className="apd-layout">
        <div className="apd-grid">
          {/* Image / Actions */}
          <aside className="apd-card apd-media">
            {galleryMain ? (
              <img src={galleryMain} alt={vm.name} className="apd-photo" />
            ) : (
              <div className="apd-photo apd-photo--empty">No Image</div>
            )}

            {images.length > 1 && (
              <div className="apd-gallery">
                <div className="apd-gallery__label">Photos</div>
                <div className="apd-thumbs">
                  {images.map((img) => {
                    const src = buildImageUrl(img.url);
                    const key = img.id || img.url;
                    return (
                      <button
                        key={key}
                        type="button"
                        className="apd-thumb"
                        title={img.isPrimary ? "Primary" : ""}
                        onClick={() => setActiveImage(src)}
                      >
                        <img src={src} alt={vm.name} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="apd-actions">
              <button
                type="button"
                className="apd-btn apd-btn--outlined"
                onClick={() => {
                  if (saving) return;
                  const current = vm.rawImage || "";
                  const path = window.prompt("Image path or URL:", current);
                  if (path && path.trim())
                    patchAndRefresh({ image: path.trim() });
                }}
                disabled={saving}
              >
                Replace Photo
              </button>

              <label className="apd-btn apd-btn--outlined apd-btn--file">
                Upload Gallery
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  hidden
                  disabled={saving || uploadingImages}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    try {
                      setUploadingImages(true);
                      await partsService.addPartImages(vm.id, files, {
                        setFirstAsPrimary: false,
                        sortStart: images.length,
                      });
                      toastr.success("Images uploaded.");
                      await refreshImages();
                    } catch (err) {
                      console.error(err);
                      showApiError(err, "Failed to upload images.");
                    } finally {
                      setUploadingImages(false);
                      e.target.value = ""; // reset so same files can be re-selected
                    }
                  }}
                />
              </label>

              <a
                className={`apd-btn ${!galleryMain ? "apd-btn--disabled" : ""}`}
                href={galleryMain || "#"}
                download
                onClick={(e) => {
                  if (!galleryMain) e.preventDefault();
                }}
              >
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

          {/* Meta */}
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
                      disabled={saving}
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

              {/* Quantity */}
              <div>
                <dt>Quantity</dt>
                <dd>
                  {edit.quantity ? (
                    <InLineNumber
                      value={vm.quantity ?? 0}
                      step={1}
                      disabled={saving}
                      onSubmit={(n) =>
                        patchAndRefresh({
                          quantity: Math.max(0, Math.trunc(n)),
                        })
                      }
                      onCancel={() =>
                        setEdit((e) => ({ ...e, quantity: false }))
                      }
                    />
                  ) : (
                    <>
                      {Number.isFinite(vm.quantity) ? vm.quantity : "—"}
                      <button
                        className="apd-btn apd-btn--outlined apd-btn--xs"
                        disabled={saving}
                        onClick={() =>
                          setEdit((e) => ({ ...e, quantity: true }))
                        }
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
                      disabled={saving}
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
                  <TogglePill
                    on={!!vm.rusted}
                    onClick={onToggleRusted}
                    disabled={saving}
                  >
                    {vm.rusted ? "Yes" : "No"}
                  </TogglePill>
                </dd>
              </div>
              <div>
                <dt>Tested</dt>
                <dd>
                  <TogglePill
                    on={!!vm.tested}
                    onClick={onToggleTested}
                    disabled={saving}
                  >
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
                  disabled={saving}
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
                    onClick={() => setEdit((e) => ({ ...e, desc: true }))}
                  >
                    Change Description
                  </button>
                </>
              )}
            </div>
          </article>
        </div>

        {/* AUDIT HISTORY */}
        <aside className="apd-card apd-audit-column">
          <h3>Audit History</h3>
          <AuditHistory
            partId={vm.id}
            pageSize={10}
            refreshToken={auditRefreshToken}
          />
        </aside>
      </section>

      <LocationModal
        open={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        onSave={handleLocationSave}
        initial={initialLocation}
      />
    </div>
  );
}

export default AdminPartDetails;
