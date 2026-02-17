import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toastr from "toastr";

import "./AdminPartDetails.css";
import "./add-item.css";

import addItem from "../itemPhotos/add_item.png";

import MakeModelSelector from "./MakeModelSelector";
import LocationSelector from "./LocationSelector";
import ImageDropZone from "./ImageDropZone";
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

  const [previewUrl, setPreviewUrl] = useState(addItem);

  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  // Track current main preview to revoke blobs safely
  const mainPreviewRef = useRef(addItem);

  useEffect(() => {
    catagoryService
      .getAllCatagories()
      .then((res) => setCatagoryOptions(res.item || []))
      .catch(() => toastr.error("Failed to load categories.", "Error"));
  }, []);

  // Cleanup blob urls
  useEffect(() => {
    const prevPreview = previewUrl;
    const prevGallery = galleryPreviews;

    return () => {
      // revoke previous preview if it was a blob
      if (prevPreview && prevPreview.startsWith("blob:")) {
        URL.revokeObjectURL(prevPreview);
      }

      // revoke previous gallery blobs
      (prevGallery || [])
        .filter((u) => u && u.startsWith("blob:"))
        .forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrl, galleryPreviews]);

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

  const setGalleryFromDropZone = (files) => {
    setGalleryFiles(files);

    const previews = (files || []).map((f) => URL.createObjectURL(f));
    setGalleryPreviews(previews);

    setPreviewUrl(previews[0] || addItem);
  };

  const buildPayload = () => {
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(
        key,
        typeof value === "boolean" ? value.toString() : String(value ?? ""),
      );
    });

    // TEMP: Keep if your DB/proc still requires @image on insert.
    // Remove later when insert no longer needs placeholder.
    payload.append(
      "Image",
      "/uploads/items/6c6d5554-56c0-4192-8cb9-b0aab5401100.jpg",
    );

    return payload;
  };

  const submitEvent = async (e) => {
    e?.preventDefault?.();

    if (galleryFiles.length === 0) {
      toastr.error("At least one image is required.");
      return;
    }

    if (requiredMissing.length > 0) {
      toastr.error(`Missing required fields: ${requiredMissing.join(", ")}`);
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildPayload();
      const res = await partsService.addPart(payload);
      const newId = res?.item ?? res;

      if (!newId) {
        toastr.error("Insert succeeded but returned no Id.");
        return;
      }

      await partsService.addPartImages(newId, galleryFiles);

      toastr.success("Part added successfully!");
      navigate("/admin");
    } catch (err) {
      console.error("Submission failed", err);

      const apiErrors =
        err?.response?.data?.errors ||
        err?.response?.data?.Errors ||
        (err?.response?.data?.message ? [err.response.data.message] : null);

      toastr.error(apiErrors?.join(" | ") || "Failed to add part.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-part-details apd-add">
      <header className="apd-header">
        <div className="apd-title">
          <h2>Add Part</h2>
          <span className="apd-badge apd-badge--pending">Draft</span>
        </div>

        <div className="apd-header-actions">
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
        <form id="add-part-form" onSubmit={submitEvent} className="apd-grid">
          <aside className="apd-card apd-media">
            <img src={previewUrl} alt="Preview" className="apd-photo" />

            <div className="apd-actions">
              <ImageDropZone
                files={galleryFiles}
                onFilesChange={setGalleryFromDropZone}
                disabled={submitting}
                showUploadButton={false}
                title="Add Photos (Drag & Drop or Click)"
                helper="Primary image will be the first file (index 0)."
              />

              {galleryFiles.length > 0 ? (
                <button
                  type="button"
                  className="apd-btn apd-btn--outlined"
                  onClick={() => setGalleryFromDropZone([])}
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
                      onClick={() => setPreviewUrl(src)}
                    >
                      <img src={src} alt={`Gallery ${idx + 1}`} />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="apd-btn apd-btn--outlined apd-btn--sm"
                  disabled={submitting}
                  onClick={() => setGalleryFromDropZone([])}
                >
                  Clear Gallery
                </button>
              </div>
            )}
          </aside>

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

          <article className="apd-card apd-meta">
            <h3>Meta</h3>

            <dl className="apd-dl apd-form-dl">
              <div>
                <dt>Availability</dt>
                <dd>
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
              <div>
                <dt>Other Box</dt>
                <dd>
                  <input
                    name="otherBox"
                    value={formData.otherBox}
                    onChange={handleChange}
                    className="apd-input"
                  />
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
