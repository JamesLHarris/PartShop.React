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
  const [part, setPart] = useState(null);
  const [images, setImages] = useState([]);
  const [activeImage, setActiveImage] = useState("");
  const [loading, setLoading] = useState(true);
  const { add } = useCart();
  const navigate = useNavigate();

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
        // ignore; still show legacy image
      });
  }, [id]);

  const vm = useMemo(() => {
    const p = part || {};

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
    };
  }, [part]);

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

      <section className="apd-grid">
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

          <div className="apd-dl">
            <div>
              <dt>Price</dt>
              <dd>{vm.price}</dd>
            </div>
            <div>
              <dt>In Stock</dt>
              <dd>{Number.isFinite(vm.quantity) ? vm.quantity : "—"}</dd>
            </div>
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
              <dt>Year</dt>
              <dd>{vm.year || "—"}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{vm.conditionName || "—"}</dd>
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

          <div className="apd-desc">
            <h4>Description</h4>
            <p className="apd-text">{vm.description || "No description."}</p>
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
