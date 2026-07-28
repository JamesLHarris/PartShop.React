import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";

const initialLabelForm = {
  labelPdf: null,
  carrier: "USPS",
  trackingNumber: "",
  labelCost: "",
  notes: "",
};

const initialTrackingForm = {
  carrier: "USPS",
  trackingNumber: "",
  shippedAt: "",
  notes: "",
};

const initialDeliveredForm = {
  deliveredAt: "",
  notes: "",
};

const toLocalDateTimeInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function AdminRefundShippingPanel({
  refund,
  onUpdated,
  showApiError,
  formatDate,
  formatCurrency,
}) {
  const [savingLabel, setSavingLabel] = useState(false);
  const [sendingLabel, setSendingLabel] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [labelForm, setLabelForm] = useState(initialLabelForm);
  const [trackingForm, setTrackingForm] = useState(initialTrackingForm);
  const [deliveredForm, setDeliveredForm] = useState(initialDeliveredForm);
  const [buyerReturnMethod, setBuyerReturnMethod] =
    useState("customerPostage");

  const currentStatus = refund?.status || refund?.statusName || "";
  const isApproved = currentStatus === "Approved";
  const sellerPaid = refund?.returnShippingPayer === "Seller";
  const buyerPaid = refund?.returnShippingPayer === "Buyer";
  const labelMethodLocked = Boolean(
    refund?.returnLabelFilePath || refund?.returnLabelEmailSentAt,
  );
  const usingPirateShipPdf =
    sellerPaid ||
    (buyerPaid && buyerReturnMethod === "pirateShipPdf");

  const inferredLogisticsStatus = useMemo(() => {
    if (refund?.returnDeliveredAt) return "Delivered";
    if (refund?.returnShippedAt) return "In Transit";
    if (refund?.returnLabelSentAt) return "Label Sent";
    if (usingPirateShipPdf) return "Label Pending";
    return "Awaiting Shipment";
  }, [refund, usingPirateShipPdf]);

  const isOverdue = useMemo(() => {
    if (!refund?.approvalExpiresAt || refund?.returnShippedAt) return false;
    return new Date(refund.approvalExpiresAt).getTime() < Date.now();
  }, [refund?.approvalExpiresAt, refund?.returnShippedAt]);

  useEffect(() => {
    setLabelForm({
      labelPdf: null,
      carrier: refund?.returnCarrier || "USPS",
      trackingNumber: refund?.returnTrackingNumber || "",
      labelCost:
        refund?.returnLabelCost === null ||
        refund?.returnLabelCost === undefined
          ? ""
          : String(refund.returnLabelCost),
      notes: refund?.returnShippingNotes || "",
    });

    setTrackingForm({
      carrier: refund?.returnCarrier || "USPS",
      trackingNumber: refund?.returnTrackingNumber || "",
      shippedAt: toLocalDateTimeInput(refund?.returnShippedAt),
      notes: refund?.returnShippingNotes || "",
    });

    setDeliveredForm({
      deliveredAt: toLocalDateTimeInput(refund?.returnDeliveredAt),
      notes: "",
    });

    setBuyerReturnMethod(
      refund?.returnLabelFilePath
        ? "pirateShipPdf"
        : "customerPostage",
    );
  }, [refund?.id, refund?.dateModified]);

  if (!isApproved) return null;

  const onLabelChange = (event) => {
    const { name, value } = event.target;
    setLabelForm((current) => ({ ...current, [name]: value }));
  };

  const onLabelFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (file && !file.name.toLowerCase().endsWith(".pdf")) {
      toastr.warning("Select the PDF label downloaded from Pirate Ship.");
      event.target.value = "";
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      toastr.warning("The return-label PDF must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setLabelForm((current) => ({
      ...current,
      labelPdf: file,
    }));
  };

  const onTrackingChange = (event) => {
    const { name, value } = event.target;
    setTrackingForm((current) => ({ ...current, [name]: value }));
  };

  const onDeliveredChange = (event) => {
    const { name, value } = event.target;
    setDeliveredForm((current) => ({ ...current, [name]: value }));
  };

  const saveLabel = () => {
    if (!labelForm.labelPdf) {
      toastr.warning("Select the PDF label downloaded from Pirate Ship.");
      return;
    }

    if (!labelForm.carrier.trim()) {
      toastr.warning("Carrier is required.");
      return;
    }

    if (!labelForm.trackingNumber.trim()) {
      toastr.warning("Tracking number is required.");
      return;
    }

    const labelCost = labelForm.labelCost === ""
      ? null
      : Number(labelForm.labelCost);

    if (labelCost !== null && (!Number.isFinite(labelCost) || labelCost < 0)) {
      toastr.warning("Enter a valid label cost.");
      return;
    }

    if (buyerPaid && (labelCost === null || labelCost <= 0)) {
      toastr.warning(
        "Enter the Pirate Ship label cost. It will be documented for deduction from the final refund.",
      );
      return;
    }

    setSavingLabel(true);

    const formData = new FormData();
    formData.append("LabelPdf", labelForm.labelPdf);
    formData.append("Carrier", labelForm.carrier.trim());
    formData.append(
      "TrackingNumber",
      labelForm.trackingNumber.trim(),
    );

    if (labelCost !== null) {
      formData.append("LabelCost", String(labelCost));
    }

    if (labelForm.notes.trim()) {
      formData.append("Notes", labelForm.notes.trim());
    }

    refundRequestsService
      .saveReturnLabel(refund.id, formData)
      .then((response) => {
        const updated = response?.item || null;

        if (updated?.returnLabelEmailStatus === "Sent") {
          toastr.success("Return label saved and emailed to the customer.");
        } else {
          toastr.warning(
            "The label was saved, but the customer email was not sent. Use Retry Label Email.",
          );
        }

        onUpdated(updated);
      })
      .catch((err) => {
        showApiError(err, "Unable to save the Pirate Ship label.");
      })
      .finally(() => setSavingLabel(false));
  };

  const resendLabelEmail = () => {
    setSendingLabel(true);

    refundRequestsService
      .sendReturnLabelEmail(refund.id)
      .then((response) => {
        toastr.success("Return label email sent.");
        onUpdated(response?.item || null);
      })
      .catch((err) => {
        showApiError(
          err,
          "The label remains saved, but the customer email could not be sent.",
        );
      })
      .finally(() => setSendingLabel(false));
  };

  const saveTracking = () => {
    if (!trackingForm.carrier.trim()) {
      toastr.warning("Carrier is required.");
      return;
    }

    if (!trackingForm.trackingNumber.trim()) {
      toastr.warning("Tracking number is required.");
      return;
    }

    setSavingTracking(true);

    refundRequestsService
      .updateReturnTracking(refund.id, {
        carrier: trackingForm.carrier.trim(),
        trackingNumber: trackingForm.trackingNumber.trim(),
        shippedAt: trackingForm.shippedAt
          ? new Date(trackingForm.shippedAt).toISOString()
          : null,
        notes: trackingForm.notes.trim() || null,
      })
      .then((response) => {
        toastr.success("Return tracking saved and marked in transit.");
        onUpdated(response?.item || null);
      })
      .catch((err) => {
        showApiError(err, "Unable to save the return tracking.");
      })
      .finally(() => setSavingTracking(false));
  };

  const markDelivered = () => {
    setMarkingDelivered(true);

    refundRequestsService
      .markReturnDelivered(refund.id, {
        deliveredAt: deliveredForm.deliveredAt
          ? new Date(deliveredForm.deliveredAt).toISOString()
          : null,
        notes: deliveredForm.notes.trim() || null,
      })
      .then((response) => {
        toastr.success("Return marked carrier delivered.");
        onUpdated(response?.item || null);
      })
      .catch((err) => {
        showApiError(err, "Unable to mark the return delivered.");
      })
      .finally(() => setMarkingDelivered(false));
  };

  const labelEmailStatus = refund?.returnLabelEmailStatus || "Not Sent";
  const logisticsStatus = refund?.returnLogisticsStatus || inferredLogisticsStatus;

  return (
    <div className="refunds-update-panel refunds-shipping-panel">
      <div className="refunds-section-heading">
        <div>
          <h4>Return Shipping & Tracking</h4>
          <p>
            Return labels are created as manual shipments in Pirate Ship.
            Site_2024 can email the downloaded PDF to the customer or record
            tracking when the customer purchases their own postage.
          </p>
        </div>

        <div
          className={`refunds-logistics-status ${String(logisticsStatus)
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          {isOverdue && !refund?.returnShippedAt
            ? "Overdue"
            : logisticsStatus}
        </div>
      </div>

      <div className="refunds-shipping-summary">
        <div>
          <strong>Shipping payer</strong>
          <span>{refund.returnShippingPayer || "-"}</span>
        </div>
        <div>
          <strong>Ship-by deadline</strong>
          <span>
            {usingPirateShipPdf && !refund?.returnLabelSentAt
              ? "Begins when PDF label is sent"
              : formatDate(refund?.approvalExpiresAt)}
          </span>
        </div>
        <div>
          <strong>Carrier</strong>
          <span>{refund?.returnCarrier || "-"}</span>
        </div>
        <div>
          <strong>Tracking</strong>
          <span>{refund?.returnTrackingNumber || "-"}</span>
        </div>
        <div>
          <strong>Shipped</strong>
          <span>{formatDate(refund?.returnShippedAt)}</span>
        </div>
        <div>
          <strong>Carrier delivered</strong>
          <span>{formatDate(refund?.returnDeliveredAt)}</span>
        </div>
      </div>

      {buyerPaid && (
        <div className="refunds-shipping-method">
          <div>
            <strong>Buyer-Paid Return Method</strong>
            <span>
              Choose whether GR&Sons creates the Pirate Ship label up front or
              the customer purchases postage independently.
            </span>
          </div>

          <label
            className={`refunds-shipping-method-option ${
              buyerReturnMethod === "pirateShipPdf" ? "is-selected" : ""
            }`}
          >
            <input
              type="radio"
              name="buyerReturnMethod"
              value="pirateShipPdf"
              checked={buyerReturnMethod === "pirateShipPdf"}
              onChange={(event) =>
                setBuyerReturnMethod(event.target.value)
              }
              disabled={labelMethodLocked}
            />
            <span>
              <strong>GR&Sons creates a Pirate Ship PDF label</strong>
              <small>
                GR&Sons pays Pirate Ship initially. The documented label cost
                is deducted from the customer's final refund after inspection.
              </small>
            </span>
          </label>

          <label
            className={`refunds-shipping-method-option ${
              buyerReturnMethod === "customerPostage" ? "is-selected" : ""
            }`}
          >
            <input
              type="radio"
              name="buyerReturnMethod"
              value="customerPostage"
              checked={buyerReturnMethod === "customerPostage"}
              onChange={(event) =>
                setBuyerReturnMethod(event.target.value)
              }
              disabled={labelMethodLocked}
            />
            <span>
              <strong>Customer purchases their own postage</strong>
              <small>
                Do not upload a PDF. Record the carrier and tracking number
                after the customer provides proof of shipment.
              </small>
            </span>
          </label>

          {labelMethodLocked && (
            <p className="refunds-shipping-method-lock">
              The return method is locked because a PDF label has already been
              saved. The label can still be replaced or re-emailed.
            </p>
          )}

          {refund?.isInternational && (
            <p className="refunds-international-shipping-note">
              International return postage is never reimbursed. Customer-paid
              postage is the default. When GR&Sons creates the PDF, its full
              documented cost must be deducted from the final refund.
            </p>
          )}
        </div>
      )}

      {usingPirateShipPdf ? (
        <div className="refunds-shipping-workflow">
          <div className="refunds-pirate-ship-help">
            <div>
              <strong>
                {sellerPaid
                  ? "Seller-Paid Pirate Ship PDF Label"
                  : "Buyer-Paid Pirate Ship PDF Label"}
              </strong>
              <span>
                Create a new manual shipment with the buyer as the sender and
                GR&Sons as the recipient. Download the PDF and upload it here.
                The 7-day deadline begins after Site_2024 successfully emails
                the label.
              </span>
              {buyerPaid && (
                <span>
                  The label cost is required and will be carried into the final
                  refund calculation as a documented customer deduction.
                </span>
              )}
            </div>
            <a
              className="refunds-btn secondary"
              href="https://ship.pirateship.com/"
              target="_blank"
              rel="noreferrer"
            >
              Open Pirate Ship
            </a>
          </div>

          <div className="refunds-shipping-form-grid">
            <label className="full-width">
              Pirate Ship PDF Label
              <input
                type="file"
                name="labelPdf"
                accept="application/pdf,.pdf"
                onChange={onLabelFileChange}
              />
              <span className="refunds-file-helper">
                {labelForm.labelPdf
                  ? `Selected: ${labelForm.labelPdf.name}`
                  : refund?.returnLabelOriginalFileName
                    ? `Saved: ${refund.returnLabelOriginalFileName}`
                    : "Download the completed label from Pirate Ship and select the PDF here."}
              </span>
            </label>

            <label>
              Carrier
              <input
                type="text"
                name="carrier"
                value={labelForm.carrier}
                onChange={onLabelChange}
                placeholder="USPS"
              />
            </label>

            <label>
              Tracking Number
              <input
                type="text"
                name="trackingNumber"
                value={labelForm.trackingNumber}
                onChange={onLabelChange}
              />
            </label>

            <label>
              Label Cost {buyerPaid ? "(required)" : "(optional)"}
              <input
                type="number"
                min="0"
                step="0.01"
                name="labelCost"
                value={labelForm.labelCost}
                onChange={onLabelChange}
                placeholder="0.00"
              />
              {buyerPaid && (
                <span className="refunds-file-helper">
                  This amount will be deducted from the final refund after
                  inspection.
                </span>
              )}
            </label>

            <label className="full-width">
              Internal Shipping Notes
              <textarea
                rows="3"
                name="notes"
                value={labelForm.notes}
                onChange={onLabelChange}
              />
            </label>
          </div>

          <div className="refunds-shipping-actions">
            <button
              type="button"
              className="refunds-btn primary"
              onClick={saveLabel}
              disabled={savingLabel}
            >
              {savingLabel ? "Uploading Label..." : "Upload & Email PDF Label"}
            </button>
          </div>

          {(refund?.returnLabelFilePath ||
            refund?.returnLabelEmailStatus) && (
            <div
              className={`refunds-label-email-status ${String(labelEmailStatus)
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              <div>
                <strong>Customer PDF Label Email</strong>
                <span>Status: {labelEmailStatus}</span>
                <span>
                  Attempts: {refund?.returnLabelEmailAttempts || 0}
                </span>
                {refund?.returnLabelEmailSentAt && (
                  <span>
                    Sent: {formatDate(refund.returnLabelEmailSentAt)}
                  </span>
                )}
                {refund?.returnLabelCost !== null &&
                  refund?.returnLabelCost !== undefined && (
                    <span>
                      {buyerPaid
                        ? "Customer-paid label deduction"
                        : "Internal label cost"}
                      : {formatCurrency(refund.returnLabelCost)}
                    </span>
                  )}
              </div>

              {refund?.returnLabelEmailLastError &&
                labelEmailStatus === "Failed" && (
                  <p>{refund.returnLabelEmailLastError}</p>
                )}

              {refund?.returnLabelFilePath && (
                <button
                  type="button"
                  className="refunds-btn secondary"
                  onClick={resendLabelEmail}
                  disabled={sendingLabel}
                >
                  {sendingLabel
                    ? "Sending PDF..."
                    : labelEmailStatus === "Sent"
                      ? "Resend PDF Label"
                      : "Retry PDF Email"}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="refunds-buyer-paid-note">
          <strong>
            {buyerPaid ? "Customer-Purchased Postage" : "No Prepaid Label Required"}
          </strong>
          <span>
            Record the carrier and tracking number after the customer provides
            proof that the approved item was shipped.
          </span>
          {refund?.isInternational && (
            <span>
              International return postage is paid by the buyer and is never
              reimbursed.
            </span>
          )}
        </div>
      )}

      <div className="refunds-shipping-subsection">
        <h5>Record Return Shipment</h5>
        <div className="refunds-shipping-form-grid">
          <label>
            Carrier
            <input
              type="text"
              name="carrier"
              value={trackingForm.carrier}
              onChange={onTrackingChange}
            />
          </label>

          <label>
            Tracking Number
            <input
              type="text"
              name="trackingNumber"
              value={trackingForm.trackingNumber}
              onChange={onTrackingChange}
            />
          </label>

          <label>
            Shipped Date / Time
            <input
              type="datetime-local"
              name="shippedAt"
              value={trackingForm.shippedAt}
              onChange={onTrackingChange}
            />
          </label>

          <label className="full-width">
            Internal Tracking Notes
            <textarea
              rows="3"
              name="notes"
              value={trackingForm.notes}
              onChange={onTrackingChange}
            />
          </label>
        </div>

        <div className="refunds-shipping-actions">
          <button
            type="button"
            className="refunds-btn primary"
            onClick={saveTracking}
            disabled={savingTracking}
          >
            {savingTracking ? "Saving Tracking..." : "Save Tracking / Mark In Transit"}
          </button>
        </div>
      </div>

      <div className="refunds-shipping-subsection">
        <h5>Carrier Delivery</h5>
        <p>
          This records the carrier delivery event only. Item receipt and
          inspection are handled in the next workflow step.
        </p>

        <div className="refunds-shipping-form-grid">
          <label>
            Delivered Date / Time
            <input
              type="datetime-local"
              name="deliveredAt"
              value={deliveredForm.deliveredAt}
              onChange={onDeliveredChange}
            />
          </label>

          <label className="full-width">
            Internal Delivery Notes
            <textarea
              rows="3"
              name="notes"
              value={deliveredForm.notes}
              onChange={onDeliveredChange}
            />
          </label>
        </div>

        <div className="refunds-shipping-actions">
          <button
            type="button"
            className="refunds-btn secondary"
            onClick={markDelivered}
            disabled={markingDelivered}
          >
            {markingDelivered ? "Saving Delivery..." : "Mark Carrier Delivered"}
          </button>
        </div>
      </div>

      {refund?.shippingEvents?.length > 0 && (
        <div className="refunds-shipping-subsection">
          <h5>Shipping Event History</h5>
          <div className="refunds-shipping-events">
            {refund.shippingEvents.map((event) => (
              <div key={event.id} className="refunds-shipping-event">
                <div>
                  <strong>{event.eventType || "Shipping Update"}</strong>
                  <span>{event.logisticsStatus || "-"}</span>
                </div>
                <div>
                  <span>{event.carrier || "-"}</span>
                  <span>{event.trackingNumber || "-"}</span>
                </div>
                <div>
                  <span>{formatDate(event.dateCreated)}</span>
                  <span>{event.createdByName || "System"}</span>
                </div>
                {event.notes && <p>{event.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRefundShippingPanel;
