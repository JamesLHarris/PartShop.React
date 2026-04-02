import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import toastr from "toastr";
import partsService from "../service/partsService";
import availableService from "../service/availableService";
import conditionService from "../service/conditionService";
import shippingPolicyService from "../service/shippingPolicyService";
import "./AdminPartDetails.css";
import InLineNumber from "./InLineNumber";
import InLineSelect from "./InLineSelect";
import InLineText from "./InLineText";
import LocationModal from "./LocationModal";
import AuditHistory from "./AuditHistory";
import ImageDropZone from "./ImageDropZone";

function AdminPartDetails() {
  const { id } = useParams();

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditRefreshToken, setAuditRefreshToken] = useState(0);
  const [conditionOptions, setConditionOptions] = useState([]);
  const [shippingPolicyOptions, setShippingPolicyOptions] = useState([]);
  const [availabilityOptions, setAvailabilityOptions] = useState([]);

  const [images, setImages] = useState([]);
  const [activeImage, setActiveImage] = useState("");
  const [newGalleryFiles, setNewGalleryFiles] = useState([]);

  const [locModalOpen, setLocModalOpen] = useState(false);
  const saveLockRef = useRef(false);

  const [edit, setEdit] = useState({
    price: false,
    quantity: false,
    availability: false,
    desc: false,
    otherBox: false,
    condition: false,
    shippingPolicy: false,
  });

  const get = (obj, ...keys) =>
    keys.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);

  const buildImageUrl = (img) => {
    if (!img) return "";
    if (/^https?:\/\//i.test(img)) return img;
    return `${partsService.partImageUrl}${img.startsWith("/") ? img : `/${img}`}`;
  };

  const fmtPrice = (n) =>
    typeof n === "number"
      ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
      : n;

  const showApiError = (err, fallback = "Update failed.") => {
    const msg =
      err?.response?.data?.errors?.[0] ||
      err?.response?.data?.error ||
      fallback;
    toastr.error(msg);
  };

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

  useEffect(() => {
    conditionService
      .getAllConditions()
      .then((res) => {
        const raw = res.item || [];
        setConditionOptions(
          raw.map((c) => ({
            value: String(c.id),
            label: c.name || "",
          })),
        );
      })
      .catch(onError);
  }, []);

  useEffect(() => {
    shippingPolicyService
      .getAllShippingPolicies()
      .then((res) => {
        const raw = res.item || [];
        setShippingPolicyOptions(
          raw.map((sp) => ({
            value: String(sp.id),
            label: sp.name || "",
          })),
        );
      })
      .catch(onError);
  }, []);

  const vm = useMemo(() => {
    const p = part || {};

    const rawCategories = Array.isArray(p.categories) ? p.categories : [];
    const rawFitments = Array.isArray(p.fitments) ? p.fitments : [];

    const normalizedCategories = rawCategories
      .map((c) => ({
        id: c.id,
        catagoryId: c.catagoryId,
        catagoryName: c.catagoryName,
      }))
      .filter((c) => c.catagoryId || c.catagoryName);

    const normalizedFitments = rawFitments
      .map((f) => ({
        id: f.id,
        makeId: f.makeId,
        company: f.company,
        modelId: f.modelId,
        modelName: f.modelName,
        yearStart: f.yearStart,
        yearEnd: f.yearEnd,
      }))
      .filter((f) => f.makeId || f.company || f.modelName);

    return {
      id: p.id,
      name: p.name,
      category: p.catagoryName ?? get(p, "catagory", "name"),
      company: p.company ?? get(p, "make", "company"),
      model: p.modelName ?? get(p, "make", "model", "name"),
      year: p.year,
      partNumber: p.partnumber ?? p.partNumber,

      availableStatus: p.availableStatus ?? get(p, "available", "status"),
      availableId: p.availableId ?? get(p, "available", "id"),

      conditionId: p.conditionId ?? get(p, "condition", "id"),
      conditionName: p.conditionName ?? get(p, "condition", "name"),

      shippingPolicyId: p.shippingPolicyId ?? get(p, "shippingPolicy", "id"),
      shippingPolicyName:
        p.shippingPolicyName ?? get(p, "shippingPolicy", "name"),

      site: p.siteName ?? get(p, "location", "site", "name"),
      area: p.areaName ?? get(p, "location", "area", "name"),
      aisle: p.aisleName ?? get(p, "location", "aisle", "name"),
      shelf: p.shelfName ?? get(p, "location", "shelf", "name"),
      section: p.sectionName ?? get(p, "location", "section", "name"),
      box: p.boxName ?? get(p, "location", "box", "name"),
      otherBox: p.otherBox ?? p.OtherBox ?? p.other_box,

      price: p.price,
      quantity: p.quantity,
      lastMovedBy: p.lastMovedBy ?? get(p, "user", "name"),
      dateCreated: p.datecreated ?? p.dateCreated,
      dateModified: p.datemodified ?? p.dateModified,

      image: buildImageUrl(p.image),
      rawImage: p.image || "",
      description: p.description,
      locationId: p.locationId ?? get(p, "location", "id"),
      location: p.location,

      categories: normalizedCategories,
      fitments: normalizedFitments,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  const initialLocation = {
    siteId: get(vm, "location", "site", "id") ?? null,
    areaId: get(vm, "location", "area", "id") ?? null,
    aisleId: get(vm, "location", "aisle", "id") ?? null,
    shelfId: get(vm, "location", "shelf", "id") ?? null,
    sectionId: get(vm, "location", "section", "id") ?? null,
    boxId: get(vm, "location", "box", "id") ?? null,
  };

  const patchAndRefresh = async (payload) => {
    if (saveLockRef.current) return;
    if (!payload || typeof payload !== "object") return;

    saveLockRef.current = true;
    setSaving(true);

    try {
      await partsService.patchPart(payload, vm.id);
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
        otherBox: false,
        condition: false,
        shippingPolicy: false,
      });
    }
  };

  const openLocationModal = () => {
    if (saving) return;
    setLocModalOpen(true);
  };

  const handleLocationSave = async (locationId) => {
    await patchAndRefresh({ locationId });
    setLocModalOpen(false);
  };

  const renderYearRange = (start, end) => {
    if (start == null && end == null) return "—";
    if (start === end) return String(start);
    return `${start}–${end}`;
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
                  if (path && path.trim()) {
                    patchAndRefresh({ image: path.trim() });
                  }
                }}
                disabled={saving}
              >
                Replace Photo
              </button>

              <ImageDropZone
                partId={vm.id}
                files={newGalleryFiles}
                onFilesChange={setNewGalleryFiles}
                onUploaded={refreshImages}
                disabled={saving}
                showUploadButton={true}
                title="Upload Gallery (Drag & Drop or Click)"
                helper="Primary image will be the first file."
              />

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

          <article className="apd-card apd-specs">
            <h3>Specs</h3>
            <dl className="apd-dl">
              <div>
                <dt>Part #</dt>
                <dd>{vm.partNumber || "—"}</dd>
              </div>
              <div>
                <dt>Primary Year</dt>
                <dd>{vm.year ?? "—"}</dd>
              </div>
              <div>
                <dt>Primary Category</dt>
                <dd>{vm.category || "—"}</dd>
              </div>
              <div>
                <dt>Primary Make</dt>
                <dd>{vm.company || "—"}</dd>
              </div>
              <div>
                <dt>Primary Model</dt>
                <dd>{vm.model || "—"}</dd>
              </div>
            </dl>
          </article>

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

            <div className="apd-other-box-row">
              <dt>Other Box</dt>
              <dd>
                {edit.otherBox ? (
                  <div className="apd-inline">
                    <input
                      type="text"
                      maxLength={100}
                      className="apd-input"
                      defaultValue={vm.otherBox || ""}
                      disabled={saving}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = e.currentTarget.value?.trim();
                          patchAndRefresh({ otherBox: v || null });
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEdit((s) => ({ ...s, otherBox: false }));
                        }
                      }}
                    />
                    <button
                      className="apd-btn apd-btn--outlined apd-btn--xs"
                      disabled={saving}
                      onClick={(e) => {
                        const input =
                          e.currentTarget.parentElement?.querySelector("input");
                        const v = input?.value?.trim();
                        patchAndRefresh({ otherBox: v || null });
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="apd-btn apd-btn--outlined apd-btn--xs"
                      disabled={saving}
                      onClick={() =>
                        setEdit((s) => ({ ...s, otherBox: false }))
                      }
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="apd-inline-wrap">
                    <span>{vm.otherBox || "—"}</span>
                    <button
                      className="apd-btn apd-btn--outlined apd-btn--xs"
                      disabled={saving}
                      onClick={() => setEdit((s) => ({ ...s, otherBox: true }))}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </dd>
            </div>
          </article>

          <article className="apd-card apd-relations">
            <h3>Compatibility & Categories</h3>

            <div className="apd-relations-section">
              <h4>Categories</h4>
              {vm.categories.length > 0 ? (
                <div className="apd-chip-list">
                  {vm.categories.map((cat) => (
                    <span
                      key={cat.id || `${cat.catagoryId}-${cat.catagoryName}`}
                      className="apd-chip"
                    >
                      {cat.catagoryName || `Category #${cat.catagoryId}`}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="apd-empty-note">No related categories.</div>
              )}
            </div>

            <div className="apd-relations-section">
              <h4>Fitments</h4>
              {vm.fitments.length > 0 ? (
                <div className="apd-fitment-list">
                  {vm.fitments.map((fitment) => (
                    <div
                      key={
                        fitment.id ||
                        `${fitment.makeId}-${fitment.modelId}-${fitment.yearStart}-${fitment.yearEnd}`
                      }
                      className="apd-fitment-card"
                    >
                      <div className="apd-fitment-title">
                        {fitment.company || "—"} {fitment.modelName || ""}
                      </div>
                      <div className="apd-subtle">
                        Years:{" "}
                        {renderYearRange(fitment.yearStart, fitment.yearEnd)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="apd-empty-note">No related fitments.</div>
              )}
            </div>
          </article>

          <article className="apd-card apd-meta">
            <h3>Meta</h3>
            <dl className="apd-dl">
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

              <div>
                <dt>Condition</dt>
                <dd>
                  {edit.condition ? (
                    <InLineSelect
                      value={String(vm.conditionId ?? "")}
                      options={conditionOptions}
                      disabled={saving}
                      onSubmit={(val) =>
                        patchAndRefresh({ conditionId: Number(val) })
                      }
                      onCancel={() =>
                        setEdit((e) => ({ ...e, condition: false }))
                      }
                    />
                  ) : (
                    <>
                      {vm.conditionName || "—"}
                      <button
                        className="apd-btn apd-btn--outlined apd-btn--xs"
                        disabled={saving}
                        onClick={() =>
                          setEdit((e) => ({ ...e, condition: true }))
                        }
                      >
                        Change
                      </button>
                    </>
                  )}
                </dd>
              </div>

              <div>
                <dt>Shipping Policy</dt>
                <dd>
                  {edit.shippingPolicy ? (
                    <InLineSelect
                      value={String(vm.shippingPolicyId ?? "")}
                      options={shippingPolicyOptions}
                      disabled={saving}
                      onSubmit={(val) =>
                        patchAndRefresh({ shippingPolicyId: Number(val) })
                      }
                      onCancel={() =>
                        setEdit((e) => ({ ...e, shippingPolicy: false }))
                      }
                    />
                  ) : (
                    <>
                      {vm.shippingPolicyName || "—"}
                      <button
                        className="apd-btn apd-btn--outlined apd-btn--xs"
                        disabled={saving}
                        onClick={() =>
                          setEdit((e) => ({ ...e, shippingPolicy: true }))
                        }
                      >
                        Change
                      </button>
                    </>
                  )}
                </dd>
              </div>

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
