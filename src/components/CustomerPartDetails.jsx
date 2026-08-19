import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import partsService from "../service/partsService";
import shopifyCheckoutService from "../service/shopifyCheckoutService";
import "./AdminPartDetails.css";
import { useCart } from "./CartContext";
import PhotoLightbox from "./PhotoLightbox";

const buildImageUrl = (img) =>
  !img
    ? ""
    : /^https?:\/\//i.test(img)
      ? img
      : `${partsService.partImageUrl}${img.startsWith("/") ? img : `/${img}`}`;

const get = (obj, ...path) =>
  path.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const getConditionPolicy = (conditionName) => {
  const normalized = String(conditionName || "")
    .trim()
    .toLowerCase();

  if (
    normalized.includes("not working") ||
    normalized.includes("for parts") ||
    normalized.includes("parts only") ||
    normalized.includes("as-is") ||
    normalized.includes("as is")
  ) {
    return {
      key: "not-working",
      title: "Parts / Not Working Policy",
      summary:
        "This item is sold as-is for parts, repair, or rebuilding and is not eligible for return.",
      bullets: [
        "Review the listing description and all available photos before purchasing.",
        "The item may be incomplete, damaged, or unsuitable for normal installation.",
        "Contact GR & Sons before checkout if you need clarification about the item's condition.",
      ],
    };
  }

  if (normalized.includes("new")) {
    return {
      key: "new",
      title: "New Part Policy",
      summary:
        "New parts may be considered for return within 30 days of delivery, subject to approval and inspection.",
      bullets: [
        "The part must be returned in the condition in which it was received.",
        "A return request must be approved before the item is sent back.",
        "Deductions may apply if the returned item is altered, incomplete, or damaged.",
      ],
    };
  }

  if (normalized.includes("used")) {
    return {
      key: "used",
      title: "Used Part Policy",
      summary:
        "Used parts may be considered for return within 30 days of delivery, subject to approval and inspection.",
      bullets: [
        "Normal signs of prior use, age, and cosmetic wear should be expected.",
        "A return request must be approved before the item is sent back.",
        "Deductions may apply when the returned condition differs from the condition at shipment.",
      ],
    };
  }

  return {
    key: "general",
    title: "Condition and Return Policy",
    summary:
      "Return eligibility depends on the listed condition and requires approval before an item is sent back.",
    bullets: [
      "Review the condition, description, photos, and compatibility information before purchasing.",
      "Contact GR & Sons before checkout if you need clarification.",
    ],
  };
};

function CustomerPartDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const [part, setPart] = useState(null);
  const [images, setImages] = useState([]);
  const [activeImage, setActiveImage] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

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
      brand: p.brand ?? p.Brand ?? "",
      availableStatus: p.availableStatus ?? get(p, "available", "status"),
      availableId: p.availableId ?? get(p, "available", "id"),
      conditionId: p.conditionId ?? get(p, "condition", "id"),
      conditionName: p.conditionName ?? get(p, "condition", "name"),
      shippingPolicyId: p.shippingPolicyId ?? get(p, "shippingPolicy", "id"),
      shippingPolicyName:
        p.shippingPolicyName ?? get(p, "shippingPolicy", "name"),
      allowsOnlineCheckout:
        (p.allowsOnlineCheckout ??
          get(p, "shippingPolicy", "allowsOnlineCheckout")) !== false,
      price: priceValue,
      unitPrice: Number(p.price) || 0,
      description: p.description,
      image: buildImageUrl(p.image),
      quantity: Number(p.quantity),
      quantitySold: Number(p.quantitySold) || 0,
      canCheckout:
        (p.availableStatus ?? get(p, "available", "status")) === "Available" &&
        Number(p.quantity) > 0 &&
        (p.allowsOnlineCheckout ??
          get(p, "shippingPolicy", "allowsOnlineCheckout")) !== false,
      requiresShippingQuote:
        (p.allowsOnlineCheckout ??
          get(p, "shippingPolicy", "allowsOnlineCheckout")) === false,
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
  const lightboxImages = [];
  const seenLightboxImages = new Set();

  const addLightboxImage = (src, alt) => {
    if (!src || seenLightboxImages.has(src)) return;
    seenLightboxImages.add(src);
    lightboxImages.push({ src, alt });
  };

  images.forEach((img, imageIndex) => {
    addLightboxImage(
      buildImageUrl(img.url),
      `${vm.name} photo ${imageIndex + 1}`,
    );
  });

  if (galleryMain && !seenLightboxImages.has(galleryMain)) {
    lightboxImages.unshift({ src: galleryMain, alt: vm.name });
  }

  const lightboxStartIndex = Math.max(
    lightboxImages.findIndex((image) => image.src === galleryMain),
    0,
  );
  const conditionPolicy = getConditionPolicy(vm.conditionName);

  const handleBuyNow = async () => {
    setCheckoutError("");
    setCheckingOut(true);

    try {
      const response = await shopifyCheckoutService.createSinglePartCheckout(
        vm.id,
        1,
      );
      const checkoutUrl = response?.item?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error("Shopify checkout URL was not returned.");
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      const apiMessage = err?.response?.data?.errors?.[0];
      setCheckoutError(
        apiMessage || err.message || "Unable to start Shopify checkout.",
      );
      setCheckingOut(false);
    }
  };

  const handleContactAboutPart = () => {
    const isShippingQuote = vm.requiresShippingQuote;
    const searchParams = new URLSearchParams({
      inquiryType: isShippingQuote ? "shipping" : "parts",
      partId: String(vm.id),
      subject: isShippingQuote
        ? `Shipping quote request: ${vm.name}`
        : `Question about part ${vm.name}`,
      message: isShippingQuote
        ? `I am interested in ${vm.name}. Please provide a shipping quote and instructions for purchasing this item directly.`
        : `I have a question about ${vm.name} (Part ID #${vm.id}).`,
    });

    navigate(`/contact?${searchParams.toString()}`);
  };

  const handleAdd = () => {
    const cartImage = galleryMain || vm.image;

    add(
      {
        id: vm.id,
        name: vm.name,
        image: cartImage,
        unitPrice: vm.unitPrice,
        maxQuantity: Number(vm.quantity) || 1,
      },
      1,
    );
  };

  return (
    <div className="admin-part-details admin-part-details--customer">
      <header className="apd-header apd-header--customer">
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

        <button
          type="button"
          className="apd-btn apd-btn--outlined apd-back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </header>

      <section className="apd-grid apd-grid--customer">
        <div className="apd-customer-main">
          <aside className="apd-card apd-media apd-media--customer">
            <div className="apd-main-image-container">
              {galleryMain ? (
                <button
                  type="button"
                  className="apd-main-image-button"
                  aria-label={`Open photo viewer for ${vm.name}`}
                  onClick={() => setLightboxOpen(true)}
                >
                  <img src={galleryMain} alt={vm.name} className="apd-photo" />
                </button>
              ) : (
                <div className="apd-photo apd-photo--empty">No Image</div>
              )}
            </div>

            {images.length > 1 && (
              <div className="apd-gallery">
                <div className="apd-gallery__label">Photos</div>
                <div className="apd-thumbs">
                  {images.map((img) => {
                    const src = buildImageUrl(img.url);
                    const key = img.id || img.url;
                    const isActive = src === galleryMain;

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`apd-thumb ${isActive ? "apd-thumb--active" : ""}`}
                        title={img.isPrimary ? "Primary" : ""}
                        aria-pressed={isActive}
                        onClick={() => setActiveImage(src)}
                      >
                        <img src={src} alt={vm.name} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
          <article
            className={`apd-card apd-policy-card apd-policy-card--${conditionPolicy.key}`}
          >
            <h3>{conditionPolicy.title}</h3>
            <p className="apd-policy-summary">{conditionPolicy.summary}</p>
            <ul className="apd-policy-list">
              {conditionPolicy.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <Link className="apd-policy-link" to="/policies">
              Review all purchasing and return policies
            </Link>
          </article>
        </div>

        <div className="apd-customer-side">
          <aside className="apd-card apd-purchase-card">
            <h3>Purchase Details</h3>

            <div className="apd-dl apd-dl--stack">
              <div>
                <dt>Price</dt>
                <dd>{vm.price}</dd>
              </div>
              <div>
                <dt>Inventory</dt>
                <dd>
                  <span>
                    In stock: {Number.isFinite(vm.quantity) ? vm.quantity : "—"}
                  </span>
                  {vm.quantitySold > 0 && (
                    <>
                      <span aria-hidden="true"> | </span>
                      <span>Sold: {vm.quantitySold}</span>
                    </>
                  )}
                </dd>
              </div>
            </div>

            {checkoutError && (
              <div className="apd-checkout-error" role="alert">
                {checkoutError}
              </div>
            )}

            {vm.requiresShippingQuote && (
              <div className="apd-shipping-quote" role="note">
                <strong>Custom shipping quote required</strong>
                <span>
                  Due to this item&apos;s size, weight, or handling
                  requirements, it is not available through Shopify checkout.
                  Contact GR &amp; Sons to arrange shipping and purchase
                  directly.
                </span>
              </div>
            )}

            <div className="apd-actions apd-actions--stacked">
              {vm.requiresShippingQuote ? (
                <button
                  type="button"
                  className="apd-btn"
                  onClick={handleContactAboutPart}
                >
                  Contact for Shipping Quote
                </button>
              ) : (
                <>
                  <button
                    className="apd-btn"
                    onClick={handleBuyNow}
                    disabled={!vm.canCheckout || checkingOut}
                  >
                    {checkingOut ? "Starting Checkout..." : "Buy Now"}
                  </button>
                  <button
                    className="apd-btn apd-btn--outlined apd-btn--with-icon"
                    onClick={handleAdd}
                    disabled={!vm.canCheckout}
                  >
                    <svg
                      className="apd-btn__icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M3 4h2l2.25 10.25a2 2 0 0 0 1.95 1.57h7.92a2 2 0 0 0 1.94-1.52L21 7H7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="10" cy="20" r="1.25" fill="currentColor" />
                      <circle cx="18" cy="20" r="1.25" fill="currentColor" />
                    </svg>
                    <span>Add to Cart</span>
                  </button>
                  <button
                    type="button"
                    className="apd-btn apd-btn--outlined"
                    onClick={handleContactAboutPart}
                  >
                    Contact About This Part
                  </button>
                </>
              )}
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
                <dt>Brand</dt>
                <dd>{vm.brand || "—"}</dd>
              </div>
              <div>
                <dt>Year(s)</dt>
                <dd>{vm.year || "—"}</dd>
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
                <dt>Condition</dt>
                <dd>{vm.conditionName || "—"}</dd>
              </div>
            </dl>

            <div className="apd-desc">
              <h4>Description</h4>
              <p className="apd-text">{vm.description || "No description."}</p>

              {vm.requiresShippingQuote && (
                <p className="apd-description-shipping-note" role="note">
                  <strong>
                    Custom shipping quote required. Due to this item&apos;s
                    size, weight, or handling requirements, it is not available
                    through Shopify checkout. Contact GR &amp; Sons to arrange
                    shipping and purchase directly.
                  </strong>
                </p>
              )}
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
        </div>
      </section>

      <PhotoLightbox
        open={lightboxOpen}
        images={lightboxImages}
        startIndex={lightboxStartIndex}
        title={`${vm.name} photos`}
        onClose={() => setLightboxOpen(false)}
        onImageChange={(src) => {
          if (src) setActiveImage(src);
        }}
      />
    </div>
  );
}

export default CustomerPartDetails;
