import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";
import "./CustomerReturnRequest.css";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_COUNT = 10;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SQL_BIGINT = "9223372036854775807";
const MAX_SQL_INT = "2147483647";

const initialForm = {
  partId: "",
  shopifyOrderId: "",
  orderNumber: "",
  customerEmail: "",
  returnReasonId: "",
  notes: "",
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const createPhotoId = (file) => {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random()}`;
};

function CustomerReturnRequest() {
  const [searchParams] = useSearchParams();
  const prefilledPartId = searchParams.get("partId") || "";

  const [formData, setFormData] = useState(() => ({
    ...initialForm,
    partId: prefilledPartId,
  }));
  const [returnReasons, setReturnReasons] = useState([]);
  const [photos, setPhotos] = useState([]);
  const photosRef = useRef([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const selectedReason = useMemo(() => {
    return returnReasons.find(
      (reason) => Number(reason.id) === Number(formData.returnReasonId),
    );
  }, [returnReasons, formData.returnReasonId]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    loadReturnReasons();

    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
    };
  }, []);

  const loadReturnReasons = async () => {
    setLoadingReasons(true);

    try {
      const response = await refundRequestsService.getReturnReasons();
      setReturnReasons(response?.item || []);
    } catch (err) {
      showApiError(err, "Unable to load return reasons.");
    } finally {
      setLoadingReasons(false);
    }
  };

  const showApiError = (err, fallback = "Something went wrong.") => {
    const msg =
      err?.response?.data?.errors?.[0] ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      fallback;

    toastr.error(msg);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePhotoChange = (event) => {
    const incoming = Array.from(event.target.files || []);
    addPhotos(incoming);

    // Allows selecting the same filename again after it has been removed.
    event.target.value = "";
  };

  const addPhotos = (incoming) => {
    if (!incoming.length) {
      return;
    }

    const existingKeys = new Set(
      photos.map(
        (photo) =>
          `${photo.file.name}|${photo.file.size}|${photo.file.lastModified}`,
      ),
    );

    const availableSlots = Math.max(0, MAX_PHOTO_COUNT - photos.length);

    if (availableSlots === 0) {
      toastr.error(`A maximum of ${MAX_PHOTO_COUNT} proof photos is allowed.`);
      return;
    }

    const valid = [];

    incoming.forEach((file) => {
      if (valid.length >= availableSlots) {
        return;
      }

      const fileKey = `${file.name}|${file.size}|${file.lastModified}`;

      if (existingKeys.has(fileKey)) {
        toastr.info(`${file.name} is already selected.`);
        return;
      }

      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        toastr.error(
          `${file.name} is not a valid image type. Use JPG, PNG, or WEBP.`,
        );
        return;
      }

      if (file.size <= 0) {
        toastr.error(`${file.name} is empty and cannot be uploaded.`);
        return;
      }

      if (file.size > MAX_PHOTO_BYTES) {
        toastr.error(
          `${file.name} is too large. Maximum proof-photo size is 5 MB.`,
        );
        return;
      }

      existingKeys.add(fileKey);
      valid.push({
        id: createPhotoId(file),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (incoming.length > availableSlots) {
      toastr.warning(
        `Only ${availableSlots} more photo${
          availableSlots === 1 ? "" : "s"
        } could be added. The maximum is ${MAX_PHOTO_COUNT}.`,
      );
    }

    if (valid.length) {
      setPhotos((current) => [...current, ...valid]);
    }
  };

  const removePhoto = (photoId) => {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === photoId);

      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }

      return current.filter((item) => item.id !== photoId);
    });
  };

  const clearPhotos = () => {
    photos.forEach((photo) => {
      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    });

    setPhotos([]);
  };

  const validateIdentifier = (value, label, maxValue, required) => {
    const trimmed = value.trim();

    if (!trimmed) {
      if (required) {
        toastr.error(`Please enter the ${label}.`);
        return false;
      }

      return true;
    }

    if (!/^\d+$/.test(trimmed)) {
      toastr.error(`${label} must contain numbers only.`);
      return false;
    }

    // Normalize leading zeroes without converting the identifier to Number.
    // This preserves all digits in large Shopify IDs on older browsers/builds
    // that do not expose BigInt to the current ESLint environment.
    const normalized = trimmed.replace(/^0+(?=\d)/, "");

    if (normalized === "0") {
      toastr.error(`${label} must be greater than zero.`);
      return false;
    }

    const exceedsMaximum =
      normalized.length > maxValue.length ||
      (normalized.length === maxValue.length && normalized > maxValue);

    if (exceedsMaximum) {
      toastr.error(`${label} is larger than the supported value.`);
      return false;
    }

    return true;
  };

  const validate = () => {
    if (
      !validateIdentifier(
        formData.partId,
        "part/listing ID",
        MAX_SQL_INT,
        true,
      )
    ) {
      return false;
    }

    if (
      !validateIdentifier(
        formData.shopifyOrderId,
        "Shopify order ID",
        MAX_SQL_BIGINT,
        false,
      )
    ) {
      return false;
    }

    if (!formData.orderNumber.trim()) {
      toastr.error("Please enter your order number.");
      return false;
    }

    if (!formData.customerEmail.trim()) {
      toastr.error("Please enter your email address.");
      return false;
    }

    if (!formData.returnReasonId) {
      toastr.error("Please select a return reason.");
      return false;
    }

    if (selectedReason?.requiresNotes && !formData.notes.trim()) {
      toastr.error("This return reason requires a written description.");
      return false;
    }

    if (selectedReason?.requiresPhotos && photos.length === 0) {
      toastr.error("This return reason requires at least one proof photo.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || !validate()) {
      return;
    }

    const payload = new FormData();

    // Keep identifier values as strings in JavaScript so large Shopify IDs
    // never pass through Number and lose precision.
    payload.append("PartId", formData.partId.trim());
    payload.append("OrderNumber", formData.orderNumber.trim());
    payload.append("CustomerEmail", formData.customerEmail.trim());
    payload.append("ReturnReasonId", formData.returnReasonId);

    if (formData.shopifyOrderId.trim()) {
      payload.append("ShopifyOrderId", formData.shopifyOrderId.trim());
    }

    if (formData.notes.trim()) {
      payload.append("Notes", formData.notes.trim());
    }

    photos.forEach((photo) => {
      payload.append("Photos", photo.file);
    });

    setSubmitting(true);

    try {
      const response =
        await refundRequestsService.submitCustomerReturnRequest(payload);
      const id = response?.item;

      setSubmittedId(id);
      toastr.success("Return request submitted.");

      setFormData({
        ...initialForm,
        partId: prefilledPartId,
      });
      clearPhotos();
    } catch (err) {
      // Form state and selected files intentionally remain in place so the
      // customer can correct another field without re-selecting proof photos.
      showApiError(err, "Unable to submit return request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="customer-return-page">
      <section className="customer-return-card" aria-labelledby="return-title">
        <div className="customer-return-heading">
          <p className="customer-return-eyebrow">Returns</p>
          <h1 id="return-title">Request a Return</h1>
          <p className="customer-return-intro">
            Submit the request below. An administrator will review it before
            approval or denial.
          </p>
        </div>

        {submittedId && (
          <div className="return-success-box" role="status">
            Your request was submitted. Reference ID:{" "}
            <strong>{submittedId}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit} className="customer-return-form" noValidate>
          <div className="return-form-grid">
            <label htmlFor="return-part-id">
              Part / Listing ID
              <input
                id="return-part-id"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="partId"
                value={formData.partId}
                onChange={handleInputChange}
                maxLength="10"
                autoComplete="off"
                placeholder="Example: 48"
                aria-describedby="return-part-id-help"
                required
                disabled={submitting}
              />
              <span id="return-part-id-help" className="return-field-help">
                Enter the listing number without commas or spaces.
              </span>
            </label>

            <label htmlFor="return-order-number">
              Order Number
              <input
                id="return-order-number"
                type="text"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleInputChange}
                maxLength="100"
                autoComplete="off"
                required
                disabled={submitting}
              />
            </label>

            <label htmlFor="return-customer-email">
              Email Used on Order
              <input
                id="return-customer-email"
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                maxLength="256"
                autoComplete="email"
                required
                disabled={submitting}
              />
            </label>

            <label htmlFor="return-shopify-order-id">
              Shopify Order ID <span className="return-optional">(optional)</span>
              <input
                id="return-shopify-order-id"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="shopifyOrderId"
                value={formData.shopifyOrderId}
                onChange={handleInputChange}
                maxLength="19"
                autoComplete="off"
                placeholder="Numbers only"
                aria-describedby="return-shopify-order-id-help"
                disabled={submitting}
              />
              <span
                id="return-shopify-order-id-help"
                className="return-field-help"
              >
                Kept as text in the browser so the complete Shopify ID remains
                exact.
              </span>
            </label>
          </div>

          <label htmlFor="return-reason">
            Return Reason
            <select
              id="return-reason"
              name="returnReasonId"
              value={formData.returnReasonId}
              onChange={handleInputChange}
              disabled={loadingReasons || submitting}
              required
            >
              <option value="">
                {loadingReasons ? "Loading reasons..." : "Select a reason..."}
              </option>
              {returnReasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </select>
          </label>

          {selectedReason && (
            <div className="return-requirements-box" role="status">
              {selectedReason.requiresNotes || selectedReason.requiresPhotos ? (
                <span>
                  This reason requires
                  {selectedReason.requiresNotes
                    ? " a written description"
                    : ""}
                  {selectedReason.requiresNotes &&
                  selectedReason.requiresPhotos
                    ? " and"
                    : ""}
                  {selectedReason.requiresPhotos ? " proof photos" : ""}.
                </span>
              ) : (
                <span>No extra explanation is required for this reason.</span>
              )}
            </div>
          )}

          <label htmlFor="return-notes">
            Description / Notes
            <textarea
              id="return-notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="5"
              maxLength="4000"
              placeholder="Required for defective items or items that do not match the description or photos."
              disabled={submitting}
            />
          </label>

          <section
            className={`return-photo-section ${
              selectedReason?.requiresPhotos
                ? "return-photo-section--required"
                : ""
            }`}
            aria-labelledby="return-photo-title"
          >
            <div className="return-photo-heading">
              <div>
                <h2 id="return-photo-title">
                  Proof Photos
                  {selectedReason?.requiresPhotos && (
                    <span className="return-required-badge">Required</span>
                  )}
                </h2>
                <p>
                  JPG, PNG, or WEBP. Maximum 5 MB each and{" "}
                  {MAX_PHOTO_COUNT} files total.
                </p>
              </div>

              {photos.length > 0 && (
                <button
                  type="button"
                  className="return-clear-photos"
                  onClick={clearPhotos}
                  disabled={submitting}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="return-photo-picker">
              <input
                id="return-proof-photos"
                className="return-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoChange}
                disabled={submitting || photos.length >= MAX_PHOTO_COUNT}
              />
              <label
                htmlFor="return-proof-photos"
                className={`return-file-button ${
                  submitting || photos.length >= MAX_PHOTO_COUNT
                    ? "return-file-button--disabled"
                    : ""
                }`}
              >
                Choose Photos
              </label>
              <span className="return-file-count" aria-live="polite">
                {photos.length === 0
                  ? "No files selected"
                  : `${photos.length} file${
                      photos.length === 1 ? "" : "s"
                    } selected`}
              </span>
            </div>

            {photos.length > 0 && (
              <>
                <ul className="return-selected-files">
                  {photos.map((photo) => (
                    <li key={photo.id}>
                      <span className="return-selected-file-name">
                        {photo.file.name}
                      </span>
                      <span className="return-selected-file-size">
                        {formatFileSize(photo.file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        disabled={submitting}
                        aria-label={`Remove ${photo.file.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="return-photo-preview-grid">
                  {photos.map((photo, index) => (
                    <figure className="return-photo-preview" key={photo.id}>
                      <img
                        src={photo.previewUrl}
                        alt={`Selected proof ${index + 1}: ${photo.file.name}`}
                      />
                      <figcaption>{photo.file.name}</figcaption>
                    </figure>
                  ))}
                </div>
              </>
            )}
          </section>

          <button
            className="return-submit-button"
            type="submit"
            disabled={submitting || loadingReasons}
          >
            {submitting ? "Submitting..." : "Submit Return Request"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default CustomerReturnRequest;
