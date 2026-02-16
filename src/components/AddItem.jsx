import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toastr from "toastr";

import "./AdminPartDetails.css"; // reuse the same styling language
import "./add-item.css"; // keep for Add-only overrides if needed

import addItem from "../itemPhotos/add_item.png";

import MakeModelSelector from "./MakeModelSelector";
import LocationSelector from "./LocationSelector";
import catagoryService from "../service/catagoryService";
import partsService from "../service/partsService";

const initialForm = {
  name: "",
  year: "",
  partNumber: "",
  description: "",
  price: "",
  quantity: "1",
  makeId: "",
  modelId: "",
  catagoryId: "",
  locationId: "",
  availableId: 1,
  rusted: false,
  tested: false,
};

function AddItem() {
  const navigate = useNavigate();

  const [catagoryOptions, setCatagoryOptions] = useState([]);
  const [formData, setFormData] = useState(initialForm);

  // File + preview (fix mismatch: file is File|null, preview is string)
  const [previewUrl, setPreviewUrl] = useState(addItem);

  // Additional gallery images (multi-upload)
  const [galleryFiles, setGalleryFiles] = useState([]); // File[]
  const [galleryPreviews, setGalleryPreviews] = useState([]); // string[]

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    catagoryService
      .getAllCatagories()
      .then((res) => setCatagoryOptions(res.item || []))
      .catch(() => toastr.error("Failed to load categories.", "Error"));
  }, []);

  // Revoke blob urls to avoid memory leak
  useEffect(() => {
    return () => {
      galleryPreviews
        .filter((u) => u && u.startsWith("blob:"))
        .forEach((u) => URL.revokeObjectURL(u));
    };
  }, [galleryPreviews]);

  const requiredMissing = useMemo(() => {
    const required = [
      "name",
      "year",
      "partNumber",
      "price",
      "catagoryId",
      "makeId",
      "modelId",
      "locationId",
    ];
    return required.filter((k) => !String(formData[k] ?? "").trim());
  }, [formData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMakeModelChange = ({ makeId, modelId }) => {
    setFormData((prev) => ({
      ...prev,
      makeId: makeId ? String(makeId) : "",
      modelId: modelId ? String(modelId) : "",
    }));
  };

  const handleLocationChange = (loc) => {
    if (loc?.boxId) {
      setFormData((prev) => ({
        ...prev,
        locationId: String(parseInt(loc.boxId, 10)),
      }));
    }
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const okTypes = ["image/jpeg", "image/png", "image/webp"];
    const invalid = files.find((f) => !okTypes.includes(f.type));
    if (invalid) {
      toastr.error("All images must be JPG, PNG, or WEBP.");
      return;
    }

    galleryPreviews
      .filter((u) => u && u.startsWith("blob:"))
      .forEach((u) => URL.revokeObjectURL(u));

    const previews = files.map((f) => URL.createObjectURL(f));

    setGalleryFiles(files);
    setGalleryPreviews(previews);

    // Primary preview = index 0
    setPreviewUrl(previews[0]);
  };

  const buildPayload = () => {
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(
        key,
        typeof value === "boolean" ? value.toString() : String(value ?? ""),
      );
    });

    // IMPORTANT: Parts_Insert requires @image, so always send Image
    payload.append(
      "Image",
      "/uploads/items/6c6d5554-56c0-4192-8cb9-b0aab5401100.jpg",
    );

    return payload;
  };

  const submitEvent = async (e) => {
    e?.preventDefault?.();

    if (requiredMissing.length > 0) {
      toastr.error(`Missing required fields: ${requiredMissing.join(", ")}`);
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildPayload();
      const res = await partsService.addPart(payload);
      const newId = res?.item ?? res;

      // Primary thumbnail remains the single "image" used in the Add endpoint.
      if (newId && galleryFiles.length > 0) {
        await partsService.addPartImages(newId, galleryFiles);
      }

      toastr.success("Part added successfully!");
      navigate("/admin");
    } catch (err) {
      console.error("Submission failed", err);
      toastr.error("Failed to add part.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGalleryDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const okTypes = ["image/jpeg", "image/png", "image/webp"];
    const invalid = files.find((f) => !okTypes.includes(f.type));
    if (invalid) {
      toastr.error("All images must be JPG, PNG, or WEBP.");
      return;
    }

    galleryPreviews
      .filter((u) => u && u.startsWith("blob:"))
      .forEach((u) => URL.revokeObjectURL(u));

    setGalleryFiles(files);
    setGalleryPreviews(files.map((f) => URL.createObjectURL(f)));

    // Optional: set preview to first dropped image
    setPreviewUrl(URL.createObjectURL(files[0]));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="admin-part-details apd-add">
      {/* Header matches AdminPartDetails */}
      <header className="apd-header">
        <div className="apd-title">
          <h2>Add Part</h2>
          <span className="apd-badge apd-badge--pending">Draft</span>
        </div>

        <div className="apd-header-actions">
          {/* Corner submit button (single payload) */}
          <button
            type="submit"
            form="add-part-form"
            className="apd-btn apd-btn--primary"
            disabled={submitting}
            onClick={submitEvent}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>

        <div className="apd-subtle">
          Fill out Specs, Location, Meta, then submit.
        </div>
      </header>

      <section className="apd-layout">
        {/* One form wraps everything so it’s one submission */}
        <form id="add-part-form" onSubmit={submitEvent} className="apd-grid">
          {/* Image / Actions (same card as AdminPartDetails) */}
          <aside className="apd-card apd-media">
            <img src={previewUrl} alt="Preview" className="apd-photo" />
            <div className="apd-actions">
              <div
                className="apd-dropzone"
                onDrop={handleGalleryDrop}
                onDragOver={handleDragOver}
              >
                <label className="apd-btn apd-btn--outlined apd-btn--file">
                  Add Photos (Drag & Drop or Click)
                  <input
                    type="file"
                    multiple
                    onChange={handleGalleryChange}
                    accept="image/*"
                    hidden
                  />
                </label>

                <div className="apd-subtle" style={{ marginTop: "8px" }}>
                  Primary image will be the first file (index 0).
                </div>
              </div>
              {galleryFiles.length > 0 ? (
                <button
                  type="button"
                  className="apd-btn apd-btn--outlined"
                  onClick={() => {
                    galleryPreviews
                      .filter((u) => u && u.startsWith("blob:"))
                      .forEach((u) => URL.revokeObjectURL(u));

                    setGalleryFiles([]);
                    setGalleryPreviews([]);
                    setPreviewUrl(addItem);
                  }}
                  disabled={submitting}
                >
                  Clear Photos
                </button>
              ) : (
                <button type="button" className="apd-btn" disabled>
                  Download
                </button>
              )}
            </div>

            {galleryPreviews.length > 0 && (
              <div className="apd-gallery">
                <div className="apd-gallery__label">Gallery Preview</div>
                <div className="apd-thumbs">
                  {galleryPreviews.map((src, idx) => (
                    <button
                      type="button"
                      key={src}
                      className="apd-thumb"
                      title={`Gallery image ${idx + 1}`}
                      onClick={() => {
                        // allow quick swap: click a thumbnail to make it the main preview (UI-only)
                        setPreviewUrl(src);
                      }}
                    >
                      <img src={src} alt={`Gallery ${idx + 1}`} />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="apd-btn apd-btn--outlined apd-btn--sm"
                  disabled={submitting}
                  onClick={() => {
                    galleryPreviews
                      .filter((u) => u && u.startsWith("blob:"))
                      .forEach((u) => URL.revokeObjectURL(u));
                    setGalleryFiles([]);
                    setGalleryPreviews([]);
                  }}
                >
                  Clear Gallery
                </button>
              </div>
            )}
          </aside>

          {/* Specs card */}
          <article className="apd-card apd-specs">
            <h3>Specs</h3>

            <dl className="apd-dl apd-form-dl">
              <div>
                <dt>Name</dt>
                <dd>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="apd-input"
                  />
                </dd>
              </div>

              <div>
                <dt>Year</dt>
                <dd>
                  <input
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="apd-input"
                    inputMode="numeric"
                  />
                </dd>
              </div>

              <div>
                <dt>Part #</dt>
                <dd>
                  <input
                    name="partNumber"
                    value={formData.partNumber}
                    onChange={handleChange}
                    className="apd-input"
                  />
                </dd>
              </div>

              <div>
                <dt>Price</dt>
                <dd>
                  <input
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="apd-input"
                    inputMode="decimal"
                  />
                </dd>
              </div>

              <div>
                <dt>Quantity</dt>
                <dd>
                  <input
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="apd-input"
                    inputMode="numeric"
                  />
                </dd>
              </div>

              <div>
                <dt>Category</dt>
                <dd>
                  <select
                    name="catagoryId"
                    value={formData.catagoryId}
                    onChange={handleChange}
                    className="apd-input"
                  >
                    <option value="">Select Category</option>
                    {catagoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>

              <div className="apd-form-wide">
                <dd className="apd-form-wide-dd">
                  <MakeModelSelector
                    onSelectionChange={handleMakeModelChange}
                  />
                </dd>
              </div>
            </dl>
          </article>

          {/* Location card */}
          <article className="apd-card apd-location">
            <h3>Location</h3>

            <div className="apd-location-picker">
              <LocationSelector onChange={handleLocationChange} />
            </div>

            <div className="apd-actions">
              <span className="apd-subtle">
                Selected Box ID: {formData.locationId || "—"}
              </span>
            </div>
          </article>

          {/* Meta card (matches Admin view style) */}
          <article className="apd-card apd-meta">
            <h3>Meta</h3>

            <dl className="apd-dl apd-form-dl">
              <div>
                <dt>Availability</dt>
                <dd>
                  {/* Keep as dropdown or whatever you want; this matches the idea */}
                  <select
                    name="availableId"
                    value={formData.availableId}
                    onChange={handleChange}
                    className="apd-input"
                  >
                    <option value={1}>Available</option>
                    <option value={2}>Unavailable</option>
                    <option value={3}>Pending</option>
                  </select>
                </dd>
              </div>

              <div>
                <dt>Rusted</dt>
                <dd>
                  <label className="apd-check">
                    <input
                      type="checkbox"
                      name="rusted"
                      checked={formData.rusted}
                      onChange={handleChange}
                    />
                    <span>{formData.rusted ? "Yes" : "No"}</span>
                  </label>
                </dd>
              </div>

              <div>
                <dt>Tested</dt>
                <dd>
                  <label className="apd-check">
                    <input
                      type="checkbox"
                      name="tested"
                      checked={formData.tested}
                      onChange={handleChange}
                    />
                    <span>{formData.tested ? "Yes" : "No"}</span>
                  </label>
                </dd>
              </div>
            </dl>

            <div className="apd-desc">
              <h4>Description</h4>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="apd-textarea"
                rows={5}
              />
            </div>
          </article>
        </form>

        {/* Optional: if you want “Audit History” to occupy the same spot,
            you can show a placeholder card for continuity */}
        <aside className="apd-card apd-audit-column">
          <h3>Audit History</h3>
          <p className="apd-text">
            Audit will appear after the part is created.
          </p>
        </aside>
      </section>
    </div>
  );
}

export default AddItem;
