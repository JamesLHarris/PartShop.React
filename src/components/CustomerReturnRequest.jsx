import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";
import "./CustomerReturnRequest.css";

const initialForm = {
  partId: "",
  shopifyOrderId: "",
  orderNumber: "",
  customerEmail: "",
  returnReasonId: "",
  notes: "",
};

function CustomerReturnRequest() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState(() => ({
    ...initialForm,
    partId: searchParams.get("partId") || "",
  }));
  const [returnReasons, setReturnReasons] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const selectedReason = useMemo(() => {
    return returnReasons.find((reason) => Number(reason.id) === Number(formData.returnReasonId));
  }, [returnReasons, formData.returnReasonId]);

  useEffect(() => {
    loadReturnReasons();

    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    addPhotos(incoming);
    e.target.value = "";
  };

  const addPhotos = (incoming) => {
    if (!incoming.length) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxBytes = 5 * 1024 * 1024;

    const valid = [];

    incoming.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toastr.error(`${file.name} is not a valid image type. Use JPG, PNG, or WEBP.`);
        return;
      }

      if (file.size > maxBytes) {
        toastr.error(`${file.name} is too large. Max proof photo size is 5MB.`);
        return;
      }

      valid.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (valid.length) {
      setPhotos((prev) => [...prev, ...valid]);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return copy;
    });
  };

  const validate = () => {
    if (!formData.partId || Number(formData.partId) <= 0) {
      toastr.error("Please enter the part/listing id.");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = new FormData();
    payload.append("PartId", formData.partId);
    payload.append("OrderNumber", formData.orderNumber.trim());
    payload.append("CustomerEmail", formData.customerEmail.trim());
    payload.append("ReturnReasonId", formData.returnReasonId);

    if (formData.shopifyOrderId) {
      payload.append("ShopifyOrderId", formData.shopifyOrderId);
    }

    if (formData.notes.trim()) {
      payload.append("Notes", formData.notes.trim());
    }

    photos.forEach((photo) => {
      payload.append("Photos", photo.file);
    });

    setSubmitting(true);

    try {
      const response = await refundRequestsService.submitCustomerReturnRequest(payload);
      const id = response?.item;
      setSubmittedId(id);
      toastr.success("Return request submitted.");
      setFormData(initialForm);
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos([]);
    } catch (err) {
      showApiError(err, "Unable to submit return request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="customer-return-page">
      <div className="customer-return-card">
        <h2>Request a Return</h2>
        <p className="customer-return-intro">
          Submit your return request below. Requests are reviewed by an admin before approval or denial.
        </p>

        {submittedId && (
          <div className="return-success-box">
            Your request was submitted. Reference Id: <strong>{submittedId}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit} className="customer-return-form">
          <div className="return-form-grid">
            <label>
              Part / Listing Id
              <input
                type="number"
                name="partId"
                value={formData.partId}
                onChange={handleInputChange}
                min="1"
                required
              />
            </label>

            <label>
              Order Number
              <input
                type="text"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleInputChange}
                maxLength="100"
                required
              />
            </label>

            <label>
              Email Used On Order
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                maxLength="256"
                required
              />
            </label>

            <label>
              Shopify Order Id Optional
              <input
                type="number"
                name="shopifyOrderId"
                value={formData.shopifyOrderId}
                onChange={handleInputChange}
                min="1"
              />
            </label>
          </div>

          <label>
            Return Reason
            <select
              name="returnReasonId"
              value={formData.returnReasonId}
              onChange={handleInputChange}
              disabled={loadingReasons}
              required
            >
              <option value="">Select a reason...</option>
              {returnReasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </select>
          </label>

          {selectedReason && (
            <div className="return-requirements-box">
              {selectedReason.requiresNotes || selectedReason.requiresPhotos ? (
                <span>
                  This reason requires
                  {selectedReason.requiresNotes ? " a written description" : ""}
                  {selectedReason.requiresNotes && selectedReason.requiresPhotos ? " and" : ""}
                  {selectedReason.requiresPhotos ? " proof photos" : ""}.
                </span>
              ) : (
                <span>No extra explanation is required for this reason.</span>
              )}
            </div>
          )}

          <label>
            Description / Notes
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="5"
              maxLength="4000"
              placeholder="Required for defective items or items that do not match the description/photos."
            />
          </label>

          <div className="return-photo-section">
            <label className="return-photo-upload">
              Proof Photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoChange} />
            </label>

            {photos.length > 0 && (
              <div className="return-photo-preview-grid">
                {photos.map((photo, index) => (
                  <div className="return-photo-preview" key={`${photo.file.name}-${index}`}>
                    <img src={photo.previewUrl} alt={`Proof ${index + 1}`} />
                    <button type="button" onClick={() => removePhoto(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="return-submit-button" type="submit" disabled={submitting || loadingReasons}>
            {submitting ? "Submitting..." : "Submit Return Request"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default CustomerReturnRequest;
