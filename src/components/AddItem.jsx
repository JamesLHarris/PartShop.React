import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toastr from "toastr";

import "./AdminPartDetails.css";
import "./add-item.css";

import addItem from "../itemPhotos/add_item.png";
import makeService from "../service/makeService";

import MakeModelSelector from "./MakeModelSelector";
import LocationSelector from "./LocationSelector";
import ImageDropZone from "./ImageDropZone";
import catagoryService from "../service/catagoryService";
import partsService from "../service/partsService";
import conditionService from "../service/conditionService";
import shippingPolicyService from "../service/shippingPolicyService";

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
  conditionId: "1",
  shippingPolicyId: "",
  locationId: "",
  availableId: "1",
  otherBox: "",
};

function AddItem() {
  const navigate = useNavigate();

  const [catagoryOptions, setCatagoryOptions] = useState([]);
  const [conditionOptions, setConditionOptions] = useState([]);
  const [shippingPolicyOptions, setShippingPolicyOptions] = useState([]);
  const [makeOptions, setMakeOptions] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [extraCategories, setExtraCategories] = useState([]);
  const [fitments, setFitments] = useState([]);

  const [galleryItems, setGalleryItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const galleryItemsRef = useRef([]);

  const selectedItem = galleryItems[selectedIndex] || null;
  const mainPreviewUrl = selectedItem?.previewUrl || addItem;
  const mainRotation = selectedItem?.rotation || 0;

  const [searchParams] = useSearchParams();
  const sellSimilarId = searchParams.get("sellSimilarId");

  const [loadingClone, setLoadingClone] = useState(false);
  const [initialLocationValue, setInitialLocationValue] = useState(null);

  useEffect(() => {
    catagoryService
      .getAllCatagories()
      .then((res) => setCatagoryOptions(res.item || []))
      .catch(() => toastr.error("Failed to load categories.", "Error"));

    makeService
      .getAllMakes()
      .then((res) => setMakeOptions(res.item || []))
      .catch(() => toastr.error("Failed to load makes.", "Error"));

    conditionService
      .getAllConditions()
      .then((res) => setConditionOptions(res.item || []))
      .catch(() => toastr.error("Failed to load conditions.", "Error"));

    shippingPolicyService
      .getAllShippingPolicies()
      .then((res) => setShippingPolicyOptions(res.item || []))
      .catch(() => toastr.error("Failed to load shipping policies.", "Error"));
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

  useEffect(() => {
    return () => {
      revokePreviewUrls(galleryItemsRef.current);
    };
  }, []);

  useEffect(() => {
    if (!sellSimilarId) return;

    let isMounted = true;
    setLoadingClone(true);

    Promise.all([
      partsService.getPartById(sellSimilarId),
      partsService
        .getPartImagesByPartId(sellSimilarId)
        .catch(() => ({ item: [] })),
    ])
      .then(([partRes, imageRes]) => {
        if (!isMounted) return;

        const sourcePart = partRes?.item;
        const sourceImages = imageRes?.item || [];

        if (!sourcePart) {
          toastr.error("Could not load source part for Sell Similar.");
          return;
        }

        hydrateFromSourcePart(sourcePart, sourceImages);
        toastr.success("Listing prepopulated from source part.");
      })
      .catch((err) => {
        console.error("Sell Similar load failed", err);
        toastr.error("Failed to preload Sell Similar data.");
      })
      .finally(() => {
        if (isMounted) {
          setLoadingClone(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sellSimilarId]);

  const requiredMissing = useMemo(() => {
    const required = [
      "name",
      "year",
      "partNumber",
      "price",
      "catagoryId",
      "makeId",
      "modelId",
      "conditionId",
      "shippingPolicyId",
      "locationId",
      "description",
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

  const addExtraCategory = () => {
    setExtraCategories((prev) => [...prev, { catagoryId: "" }]);
  };

  const updateExtraCategory = (index, value) => {
    setExtraCategories((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, catagoryId: value } : item,
      ),
    );
  };

  const removeExtraCategory = (index) => {
    setExtraCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const addFitment = () => {
    setFitments((prev) => [
      ...prev,
      {
        makeId: "",
        yearStart: "",
        yearEnd: "",
      },
    ]);
  };

  const updateFitment = (index, field, value) => {
    setFitments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeFitment = (index) => {
    setFitments((prev) => prev.filter((_, i) => i !== index));
  };

  const buildImageUrl = (img) => {
    if (!img) return "";
    if (/^https?:\/\//i.test(img)) return img;
    return `${partsService.partImageUrl}${img.startsWith("/") ? img : `/${img}`}`;
  };

  const safeString = (value) => (value == null ? "" : String(value));

  const hydrateFromSourcePart = (sourcePart, sourceImages = []) => {
    if (!sourcePart) return;

    const categories = Array.isArray(sourcePart.categories)
      ? sourcePart.categories
      : [];

    const fitmentsRaw = Array.isArray(sourcePart.fitments)
      ? sourcePart.fitments
      : [];

    const primaryCategoryId =
      safeString(sourcePart.catagoryId) ||
      safeString(categories[0]?.catagoryId);

    const primaryFitment =
      fitmentsRaw.find(
        (f) =>
          safeString(f.makeId) === safeString(sourcePart.makeId) &&
          Number(f.yearStart) === Number(f.year) &&
          Number(f.yearEnd) === Number(f.year),
      ) || fitmentsRaw[0];

    setFormData((prev) => ({
      ...prev,
      name: safeString(sourcePart.name),
      year: safeString(sourcePart.year),
      partNumber: safeString(sourcePart.partnumber ?? sourcePart.partNumber),
      description: safeString(sourcePart.description),
      price: safeString(sourcePart.price),
      quantity: safeString(sourcePart.quantity ?? "1"),
      makeId: safeString(sourcePart.makeId ?? primaryFitment?.makeId),
      modelId: safeString(sourcePart.modelId ?? primaryFitment?.modelId),
      catagoryId: primaryCategoryId,
      conditionId: safeString(sourcePart.conditionId || "1"),
      shippingPolicyId: safeString(sourcePart.shippingPolicyId),
      locationId: safeString(sourcePart.locationId),
      availableId: "1",
      otherBox: safeString(sourcePart.otherBox ?? sourcePart.OtherBox),
    }));

    setExtraCategories(
      categories
        .filter((c) => safeString(c.catagoryId) !== primaryCategoryId)
        .map((c) => ({
          catagoryId: safeString(c.catagoryId),
        })),
    );

    const normalizedPrimaryMakeId = safeString(sourcePart.makeId);
    const normalizedPrimaryYear = safeString(sourcePart.year);

    setFitments(
      fitmentsRaw
        .filter((f) => {
          const samePrimary =
            safeString(f.makeId) === normalizedPrimaryMakeId &&
            safeString(f.yearStart) === normalizedPrimaryYear &&
            safeString(f.yearEnd) === normalizedPrimaryYear;

          return !samePrimary;
        })
        .map((f) => ({
          makeId: safeString(f.makeId),
          yearStart: safeString(f.yearStart),
          yearEnd: safeString(f.yearEnd),
        })),
    );

    setInitialLocationValue({
      siteId: sourcePart.siteId ?? sourcePart.location?.site?.id ?? "",
      areaId: sourcePart.areaId ?? sourcePart.location?.area?.id ?? "",
      aisleId: sourcePart.aisleId ?? sourcePart.location?.aisle?.id ?? "",
      shelfId: sourcePart.shelfId ?? sourcePart.location?.shelf?.id ?? "",
      sectionId: sourcePart.sectionId ?? sourcePart.location?.section?.id ?? "",
      boxId: sourcePart.boxId ?? sourcePart.location?.box?.id ?? "",
    });

    if (sourceImages.length > 0) {
      setGalleryItems(
        sourceImages.map((img, index) => ({
          id: `existing-${img.id || index}`,
          file: null,
          previewUrl: buildImageUrl(img.url),
          rotation: 0,
          isExisting: true,
        })),
      );
      setSelectedIndex(0);
    } else if (sourcePart.image) {
      setGalleryItems([
        {
          id: `existing-primary-${sourcePart.id}`,
          file: null,
          previewUrl: buildImageUrl(sourcePart.image),
          rotation: 0,
          isExisting: true,
        },
      ]);
      setSelectedIndex(0);
    }
  };

  const setGalleryFromDropZone = (files) => {
    setGalleryItems((prev) => {
      revokePreviewUrls(prev);

      return (files || []).map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        rotation: 0,
      }));
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
      if (!item?.file) {
        continue;
      }

      const rotatedFile = await rotateFile(item.file, item.rotation);
      rotatedFiles.push(rotatedFile);
    }

    return rotatedFiles;
  };

  const buildPayload = () => {
    const payload = new FormData();

    payload.append("Name", formData.name.trim());
    payload.append("CatagoryId", formData.catagoryId);
    payload.append("MakeId", formData.makeId);
    payload.append("Year", formData.year.trim());
    payload.append("ShippingPolicyId", formData.shippingPolicyId);
    payload.append("PartNumber", formData.partNumber.trim());
    payload.append("Description", formData.description.trim());
    payload.append("Price", formData.price);
    payload.append("Quantity", formData.quantity || "1");
    payload.append("LocationId", formData.locationId);
    payload.append("AvailableId", formData.availableId || "1");
    payload.append("ConditionId", formData.conditionId);

    if (String(formData.otherBox || "").trim()) {
      payload.append("OtherBox", formData.otherBox.trim());
    }

    payload.append("Categories[0].CatagoryId", formData.catagoryId);

    let categoryIndex = 1;
    extraCategories.forEach((cat) => {
      const catagoryId = String(cat.catagoryId || "").trim();

      if (catagoryId) {
        payload.append(`Categories[${categoryIndex}].CatagoryId`, catagoryId);
        categoryIndex++;
      }
    });

    const numericYear = parseInt(formData.year, 10);
    let fitmentIndex = 0;

    if (!Number.isNaN(numericYear) && String(formData.makeId || "").trim()) {
      payload.append(
        `Fitments[${fitmentIndex}].MakeId`,
        String(formData.makeId),
      );
      payload.append(
        `Fitments[${fitmentIndex}].YearStart`,
        String(numericYear),
      );
      payload.append(`Fitments[${fitmentIndex}].YearEnd`, String(numericYear));
      fitmentIndex++;
    }

    fitments.forEach((fitment) => {
      const makeId = String(fitment.makeId || "").trim();
      const yearStart = String(fitment.yearStart || "").trim();
      const yearEnd = String(fitment.yearEnd || "").trim();

      if (makeId && yearStart && yearEnd) {
        payload.append(`Fitments[${fitmentIndex}].MakeId`, makeId);
        payload.append(`Fitments[${fitmentIndex}].YearStart`, yearStart);
        payload.append(`Fitments[${fitmentIndex}].YearEnd`, yearEnd);
        fitmentIndex++;
      }
    });

    return payload;
  };

  const submitEvent = async (e) => {
    e?.preventDefault?.();

    const hasAnyImage = galleryItems.some((item) => item?.previewUrl);

    if (!hasAnyImage) {
      toastr.error("At least one image is required.");
      return;
    }

    if (requiredMissing.length > 0) {
      toastr.error(`Missing required fields: ${requiredMissing.join(", ")}`);
      return;
    }

    if (Number(formData.price) <= 0) {
      toastr.error("Price must be greater than 0.");
      return;
    }

    if (Number(formData.quantity) < 0) {
      toastr.error("Quantity cannot be negative.");
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

      if (rotatedFiles.length > 0) {
        await partsService.addPartImages(newId, rotatedFiles);
      }

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
          <h2>{sellSimilarId ? "Sell Similar" : "Add Part"}</h2>
          <span className="apd-badge apd-badge--pending">
            {sellSimilarId ? "Cloned Draft" : "Draft"}
          </span>
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
          Fill out Specs, Location, Compatibility & Categories, then submit.
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
                helper="Primary image will be the first file."
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
                <dt>Primary Year</dt>
                <dd>
                  <input
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="apd-input"
                    placeholder="e.g. 1987"
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
                <dt>Condition</dt>
                <dd>
                  <select
                    name="conditionId"
                    value={formData.conditionId}
                    onChange={handleChange}
                    className="apd-input"
                  >
                    <option value="">Select Condition</option>
                    {conditionOptions.map((condition) => (
                      <option key={condition.id} value={condition.id}>
                        {condition.name}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>

              <div>
                <dt>Shipping Policy</dt>
                <dd>
                  <select
                    name="shippingPolicyId"
                    value={formData.shippingPolicyId}
                    onChange={handleChange}
                    className="apd-input"
                  >
                    <option value="">Select Shipping Policy</option>
                    {shippingPolicyOptions.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.name}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>

              <div>
                <dt>Primary Category</dt>
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
                    initialMakeId={formData.makeId}
                    initialModelId={formData.modelId}
                  />
                </dd>
              </div>
            </dl>
          </article>

          <article className="apd-card apd-location">
            <h3>Location</h3>

            <div className="apd-location-picker">
              <LocationSelector
                onChange={handleLocationChange}
                initialValue={initialLocationValue}
              />
            </div>

            <div className="apd-actions">
              <span className="apd-subtle">
                Selected Box ID: {formData.locationId || "—"}
              </span>
            </div>
          </article>

          <article className="apd-card apd-relations">
            <h3>Compatibility & Categories</h3>

            <div className="apd-relations-section">
              <div className="apd-relations-header">
                <h4>Additional Categories</h4>
                <button
                  type="button"
                  className="apd-btn apd-btn--outlined apd-btn--sm"
                  onClick={addExtraCategory}
                  disabled={submitting}
                >
                  Add Category
                </button>
              </div>

              <p className="apd-subtle">
                Primary category is selected in Specs. Add any secondary
                categories here.
              </p>

              {extraCategories.length === 0 ? (
                <div className="apd-empty-note">
                  No additional categories added.
                </div>
              ) : (
                <div className="apd-repeater">
                  {extraCategories.map((item, index) => {
                    const takenIds = [
                      String(formData.catagoryId || ""),
                      ...extraCategories
                        .map((x, i) =>
                          i === index ? null : String(x.catagoryId || ""),
                        )
                        .filter(Boolean),
                    ];

                    return (
                      <div
                        key={`extra-cat-${index}`}
                        className="apd-repeater-row"
                      >
                        <select
                          className="apd-input"
                          value={item.catagoryId}
                          onChange={(e) =>
                            updateExtraCategory(index, e.target.value)
                          }
                        >
                          <option value="">Select Category</option>
                          {catagoryOptions
                            .filter((cat) => !takenIds.includes(String(cat.id)))
                            .map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          className="apd-btn apd-btn--outlined apd-btn--sm"
                          onClick={() => removeExtraCategory(index)}
                          disabled={submitting}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="apd-relations-section">
              <div className="apd-relations-header">
                <h4>Additional Fitments</h4>
                <button
                  type="button"
                  className="apd-btn apd-btn--outlined apd-btn--sm"
                  onClick={addFitment}
                  disabled={submitting}
                >
                  Add Fitment
                </button>
              </div>

              <p className="apd-subtle">
                The primary fitment comes from the Specs make/model and primary
                year. Add cross-compatible makes and year ranges here.
              </p>

              {fitments.length === 0 ? (
                <div className="apd-empty-note">
                  No additional fitments added.
                </div>
              ) : (
                <div className="apd-repeater">
                  {fitments.map((fitment, index) => (
                    <div key={`fitment-${index}`} className="apd-fitment-row">
                      <select
                        className="apd-input"
                        value={fitment.makeId}
                        onChange={(e) =>
                          updateFitment(index, "makeId", e.target.value)
                        }
                      >
                        <option value="">Select Make</option>
                        {makeOptions
                          .filter(
                            (make) =>
                              String(make.id) !== String(formData.makeId),
                          )
                          .map((make) => (
                            <option key={make.id} value={make.id}>
                              {make.company} - {make.model?.name}
                            </option>
                          ))}
                      </select>

                      <input
                        className="apd-input"
                        placeholder="Year Start"
                        value={fitment.yearStart}
                        onChange={(e) =>
                          updateFitment(index, "yearStart", e.target.value)
                        }
                      />

                      <input
                        className="apd-input"
                        placeholder="Year End"
                        value={fitment.yearEnd}
                        onChange={(e) =>
                          updateFitment(index, "yearEnd", e.target.value)
                        }
                      />

                      <button
                        type="button"
                        className="apd-btn apd-btn--outlined apd-btn--sm"
                        onClick={() => removeFitment(index)}
                        disabled={submitting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                    <option value="1">Available</option>
                    <option value="2">Unavailable</option>
                    <option value="3">Pending</option>
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
