import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import partsService from "../service/partsService";
import "./AdminPartDetails.css";
import { useCart } from "./CartContext";

const buildImageUrl = (img) =>
  !img
    ? ""
    : /^https?:\/\//i.test(img)
      ? img
      : `${partsService.partImageUrl}${img.startsWith("/") ? img : `/${img}`}`;

const get = (obj, ...path) =>
  path.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

function CustomerPartDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const [part, setPart] = useState(null);
  const [images, setImages] = useState([]);
  const [activeImage, setActiveImage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPart(null);
    setImages([]);
    setActiveImage("");

    partsService
      .getPartByIdCustomer(id)
      .then((res) => setPart(res.item ?? res.items ?? res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    partsService
      .getPartImagesByPartId(id)
      .then((res) => {
        const list = res?.item || [];
        setImages(list);
        const primary = list.find((x) => x.isPrimary) || list[0];
        if (primary?.url) {
          setActiveImage(buildImageUrl(primary.url));
        }
      })
      .catch(() => {
        // ignore
      });
  }, [id]);

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

    const priceValue =
      typeof p.price === "number"
        ? p.price.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
          })
        : (p.price ?? "—");

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
      price: priceValue,
      unitPrice: Number(p.price) || 0,
      description: p.description,
      image: buildImageUrl(p.image),
      quantity: p.quantity,
      dateCreated: p.datecreated ?? p.dateCreated,
      dateModified: p.datemodified ?? p.dateModified,
      categories: normalizedCategories,
      fitments: normalizedFitments,
    };
  }, [part]);

  const renderYearRange = (start, end) => {
    if (start == null && end == null) return "—";
    if (start === end) return String(start);
    return `${start}–${end}`;
  };

  if (loading || !part) {
    return <div className="apd-skeleton" aria-busy="true" />;
  }

  const galleryMain = activeImage || vm.image;

  const handleAdd = () => {
    const cartImage = galleryMain || vm.image;

    add(
      {
        id: vm.id,
        name: vm.name,
        image: cartImage,
        unitPrice: vm.unitPrice,
      },
      1,
    );
  };

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
      </header>

      <section className="apd-grid apd-grid--customer">
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

          <div className="apd-dl apd-dl--stack">
            <div>
              <dt>Price</dt>
              <dd>{vm.price}</dd>
            </div>
            <div>
              <dt>In Stock</dt>
              <dd>{Number.isFinite(vm.quantity) ? vm.quantity : "—"}</dd>
            </div>
          </div>

          <div className="apd-actions">
            <button
              className="apd-btn"
              onClick={handleAdd}
              disabled={Number.isFinite(vm.quantity) && vm.quantity <= 0}
            >
              Add to Cart
            </button>
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
              <dd>{vm.year || "—"}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{vm.conditionName || "—"}</dd>
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

          <div className="apd-desc">
            <h4>Description</h4>
            <p className="apd-text">{vm.description || "No description."}</p>
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
            <h4>Compatibility</h4>
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
              <div className="apd-empty-note">No compatibility records.</div>
            )}
          </div>
        </article>
      </section>

      <div className="apd-actions" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          className="apd-btn apd-btn--outlined"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

export default CustomerPartDetails;
