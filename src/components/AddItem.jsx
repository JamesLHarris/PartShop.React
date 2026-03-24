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
  otherBox: "",
};

function AddItem() {
  const navigate = useNavigate();

  const [catagoryOptions, setCatagoryOptions] = useState([]);
  const [formData, setFormData] = useState(initialForm);

  const [galleryItems, setGalleryItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  const galleryItemsRef = useRef([]);

  const selectedItem = galleryItems[selectedIndex] || null;
  const mainPreviewUrl = selectedItem?.previewUrl || addItem;
  const mainRotation = selectedItem?.rotation || 0;

  useEffect(() => {
    catagoryService
      .getAllCatagories()
      .then((res) => setCatagoryOptions(res.item || []))
      .catch(() => toastr.error("Failed to load categories.", "Error"));
  }, []);

  const revokePreviewUrls = (items) => {
    (items || []).forEach((item) => {
      if (item?.previewUrl && item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  useEffect(() => {
    galleryItemsRef.current = galleryItems;
  }, [galleryItems]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      revokePreviewUrls(galleryItemsRef.current);
    };
  }, []);

  const requiredMissing = useMemo(() => {
    const required = [
      "name",
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
    setGalleryItems((prev) => {
      revokePreviewUrls(prev);

      const nextItems = (files || []).map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        rotation: 0,
      }));

      return nextItems;
    });

    setSelectedIndex(0);
  };

  const clearGallery = () => {
    setGalleryFromDropZone([]);
  };

  const rotateSelected = (delta) => {
    setGalleryItems((prev) =>
      prev.map((item, index) => {
        if (index !== selectedIndex) {
          return item;
        }

        return {
          ...item,
          rotation: (item.rotation + delta + 360) % 360,
        };
      }),
    );
  };

  const buildPayload = () => {
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(
        key,
        typeof value === "boolean" ? value.toString() : String(value ?? ""),
      );
    });

    payload.append(
      "Image",
      "/uploads/items/6c6d5554-56c0-4192-8cb9-b0aab5401100.jpg",
    );

    return payload;
  };

  const loadImageFromFile = (file) =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to load image: ${file.name}`));
      };

      img.src = objectUrl;
    });

  const canvasToBlob = (canvas, type = "image/jpeg", quality = 0.92) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas conversion failed."));
            return;
          }

          resolve(blob);
        },
        type,
        quality,
      );
    });

  const rotateFile = async (file, rotation) => {
    const normalized = ((rotation % 360) + 360) % 360;

    if (normalized === 0) {
      return file;
    }

    const img = await loadImageFromFile(file);

    const swapSides = normalized === 90 || normalized === 270;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas context unavailable.");
    }

    canvas.width = swapSides ? img.height : img.width;
    canvas.height = swapSides ? img.width : img.height;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((normalized * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const outputType =
      file.type === "image/png" || file.type === "image/webp"
        ? file.type
        : "image/jpeg";

    const blob = await canvasToBlob(canvas, outputType);

    return new File([blob], file.name, {
      type: outputType,
      lastModified: Date.now(),
    });
  };

  const buildRotatedFilesForUpload = async (items) => {
    const rotatedFiles = [];

    for (const item of items) {
      const rotatedFile = await rotateFile(item.file, item.rotation);
      rotatedFiles.push(rotatedFile);
    }

    return rotatedFiles;
  };

  const submitEvent = async (e) => {
    e?.preventDefault?.();

    if (galleryItems.length === 0) {
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

      const rotatedFiles = await buildRotatedFilesForUpload(galleryItems);
      await partsService.addPartImages(newId, rotatedFiles);

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
            <img
              src={mainPreviewUrl}
              alt="Preview"
              className="apd-photo"
              style={{
                transform: `rotate(${mainRotation}deg)`,
                transition: "transform 0.2s ease",
              }}
            />

            <div className="apd-actions">
              <ImageDropZone
                files={galleryItems.map((item) => item.file)}
                onFilesChange={setGalleryFromDropZone}
                disabled={submitting}
                showUploadButton={false}
                title="Add Photos (Drag & Drop or Click)"
                helper="Primary image will be the first file (index 0)."
              />
            </div>

            {galleryItems.length > 0 && (
              <>
                <div className="apd-actions">
                  <button
                    type="button"
                    className="apd-btn apd-btn--outlined"
                    onClick={() => rotateSelected(-90)}
                    disabled={submitting}
                  >
                    Rotate Left
                  </button>

                  <button
                    type="button"
                    className="apd-btn apd-btn--outlined"
                    onClick={() => rotateSelected(90)}
                    disabled={submitting}
                  >
                    Rotate Right
                  </button>

                  <button
                    type="button"
                    className="apd-btn apd-btn--outlined"
                    onClick={clearGallery}
                    disabled={submitting}
                  >
                    Clear Photos
                  </button>
                </div>

                <div className="apd-gallery">
                  <div className="apd-gallery__label">Gallery Preview</div>

                  <div className="apd-thumbs">
                    {galleryItems.map((item, idx) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`apd-thumb ${idx === selectedIndex ? "is-active" : ""}`}
                        title={`Gallery image ${idx + 1}`}
                        onClick={() => setSelectedIndex(idx)}
                      >
                        <img
                          src={item.previewUrl}
                          alt={`Gallery ${idx + 1}`}
                          style={{
                            transform: `rotate(${item.rotation}deg)`,
                            transition: "transform 0.2s ease",
                          }}
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="apd-btn apd-btn--outlined apd-btn--sm"
                    disabled={submitting}
                    onClick={clearGallery}
                  >
                    Clear Gallery
                  </button>
                </div>
              </>
            )}

            {galleryItems.length === 0 && (
              <div className="apd-actions">
                <button type="button" className="apd-btn" disabled>
                  Download
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
