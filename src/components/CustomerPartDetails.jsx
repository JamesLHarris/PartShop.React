import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import partsService from "../service/partsService";
import "./AdminPartDetails.css";
import { useCart } from "./CartContext";

const buildImageUrl = (img) =>
  !img
    ? ""
    : /^https?:\/\//i.test(img)
    ? img
    : `https://localhost:7274${img.startsWith("/") ? img : `/${img}`}`;

function CustomerPartDetails() {
  const { id } = useParams();
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setPart(null);
    partsService
      .getPartByIdCustomer(id)
      .then((res) => setPart(res.item ?? res.items ?? res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !part)
    return <div className="apd-skeleton" aria-busy="true" />;

  const handleAdd = () => {
    add(
      {
        id: part.id,
        name: part.name,
        image: `https://localhost:7274${part.image}`,
        unitPrice: Number(part.price),
      },
      1
    );
  };

  const vm = {
    id: part.id,
    name: part.name,
    category: part.catagory?.name,
    company: part.make?.company,
    model: part.make?.model?.name,
    year: part.year,
    partNumber: part.partnumber ?? part.partNumber,
    availableStatus: part.availableStatus ?? part.available?.status,
    price:
      typeof part.price === "number"
        ? part.price.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
          })
        : part.price ?? "—",
    rusted: !!part.rusted,
    tested: !!part.tested,
    description: part.description,
    image: buildImageUrl(part.image),
    dateCreated: part.datecreated ?? part.dateCreated,
    dateModified: part.datemodified ?? part.dateModified,
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
        {/* <div className="apd-subtle">ID #{vm.id}</div> */}
      </header>

      <section className="apd-grid">
        <aside className="apd-card apd-media">
          {vm.image ? (
            <img src={vm.image} alt={vm.name} className="apd-photo" />
          ) : (
            <div className="apd-photo apd-photo--empty">No Image</div>
          )}
          {vm.image && <div className="apd-actions"></div>}
          <div className="apd-dl">
            <div>
              <dt>Price</dt>
              <dd>{vm.price}</dd>
            </div>
            <button className="apd-btn" onClick={handleAdd}>
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
            <div>
              <dt>Rusted</dt>
              <dd>{vm.rusted ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Tested</dt>
              <dd>{vm.tested ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <h3></h3>
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
