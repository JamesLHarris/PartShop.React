import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";

const RETURN_ADDRESS = [
  "GR&Sons (dporschepartsman)",
  "30025 Alicia Pkwy #563",
  "Laguna Niguel, CA 92677",
];

const initialForm = {
  decision: "Approve",
  returnShippingPayer: "",
  sellerError: "",
  customerInstructions:
    "Your return has been approved. Ship the approved item within 7 calendar days. The item must be returned in the condition received and include all supplied components.",
  adminNotes: "",
  denialReason: "",
  usePolicyOverride: false,
  policyOverrideReason: "",
};

function AdminRefundDecisionPanel({
  refund,
  onDecisionSaved,
  showApiError,
  formatDate,
}) {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [form, setForm] = useState(initialForm);

  const currentStatus = refund?.status || refund?.statusName || "";
  const isRequested = currentStatus === "Requested";
  const isApproved = currentStatus === "Approved";
  const isDenied = currentStatus === "Denied";
  const isInternational = eligibility?.isInternational === true;

  const issueCount = eligibility?.issues?.length || 0;
  const matchedItemSignature = useMemo(() => {
    return (refund?.items || [])
      .map((item) => `${item.shopifyLineItemId || ""}:${item.quantity || 0}`)
      .join("|");
  }, [refund?.items]);

  const overrideIssueCount = useMemo(() => {
    return (eligibility?.issues || []).filter(
      (issue) => issue.requiresOverride,
    ).length;
  }, [eligibility]);

  const approvalNeedsOverride =
    overrideIssueCount > 0 ||
    (isInternational && form.returnShippingPayer !== "Buyer");

  const loadEligibility = () => {
    if (!refund?.id || !isRequested) return;

    setLoading(true);

    refundRequestsService
      .getRefundEligibility(refund.id)
      .then((response) => {
        const item = response?.item || null;
        setEligibility(item);

        if (item?.isInternational) {
          setForm((current) => ({
            ...current,
            returnShippingPayer: "",
          }));
        }
      })
      .catch((err) => {
        setEligibility(null);
        showApiError(err, "Unable to evaluate return eligibility.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setEligibility(null);
    setForm({
      ...initialForm,
      adminNotes: refund?.adminNotes || "",
      denialReason: refund?.denialReason || "",
    });

    if (refund?.id && isRequested) {
      loadEligibility();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refund?.id, currentStatus, matchedItemSignature]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveDecision = () => {
    if (!refund?.id) return;

    if (form.decision === "Approve") {
      if (!eligibility) {
        toastr.warning("Run the eligibility review first.");
        return;
      }

      if (!form.returnShippingPayer) {
        toastr.warning("Choose who pays return shipping.");
        return;
      }

      if (form.sellerError === "") {
        toastr.warning("Specify whether this return was caused by seller error.");
        return;
      }

      if (!form.customerInstructions.trim()) {
        toastr.warning("Customer return instructions are required.");
        return;
      }

      if (
        approvalNeedsOverride &&
        !form.usePolicyOverride
      ) {
        toastr.warning(
          "This request requires an Admin High policy override.",
        );
        return;
      }

      if (
        form.usePolicyOverride &&
        !form.policyOverrideReason.trim()
      ) {
        toastr.warning("Enter the policy override reason.");
        return;
      }
    }

    if (
      form.decision === "Deny" &&
      !form.denialReason.trim()
    ) {
      toastr.warning("A denial reason is required.");
      return;
    }

    const payload = {
      decision: form.decision,
      returnShippingPayer:
        form.decision === "Approve"
          ? form.returnShippingPayer
          : null,
      sellerError:
        form.decision === "Approve"
          ? form.sellerError === "true"
          : null,
      customerInstructions:
        form.decision === "Approve"
          ? form.customerInstructions.trim()
          : null,
      adminNotes: form.adminNotes.trim() || null,
      denialReason:
        form.decision === "Deny"
          ? form.denialReason.trim()
          : null,
      usePolicyOverride:
        form.decision === "Approve" &&
        approvalNeedsOverride &&
        form.usePolicyOverride,
      policyOverrideReason:
        form.decision === "Approve" &&
        approvalNeedsOverride &&
        form.usePolicyOverride
          ? form.policyOverrideReason.trim()
          : null,
    };

    setSaving(true);

    refundRequestsService
      .applyRefundDecision(refund.id, payload)
      .then((response) => {
        const updated = response?.item || null;
        if (updated?.decisionEmailStatus === "Sent") {
          toastr.success(
            form.decision === "Approve"
              ? "Return approved and customer email sent."
              : "Return denied and customer email sent.",
          );
        } else {
          toastr.warning(
            "The decision was saved, but the customer email was not sent. Use Retry Decision Email.",
          );
        }

        onDecisionSaved(updated);
      })
      .catch((err) => {
        showApiError(err, "Unable to save the return decision.");
      })
      .finally(() => setSaving(false));
  };

  const resendDecisionEmail = () => {
    if (!refund?.id) return;

    setSendingEmail(true);

    refundRequestsService
      .sendRefundDecisionEmail(refund.id)
      .then((response) => {
        const updated = response?.item || null;
        toastr.success("Customer decision email sent.");
        onDecisionSaved(updated);
      })
      .catch((err) => {
        showApiError(
          err,
          "The decision remains saved, but the customer email could not be sent.",
        );
      })
      .finally(() => setSendingEmail(false));
  };

  const decisionEmailStatus =
    refund?.decisionEmailStatus || "Not Sent";

  if (isApproved || isDenied || !isRequested) {
    return (
      <div className="refunds-update-panel refunds-decision-summary">
        <h4>Admin Decision</h4>
        <div className={`refunds-decision-status ${currentStatus.toLowerCase()}`}>
          {currentStatus}
        </div>

        {refund?.eligibilityStatus && (
          <p>
            <strong>Eligibility:</strong> {refund.eligibilityStatus}
          </p>
        )}

        {refund?.eligibilitySummary && (
          <p>{refund.eligibilitySummary}</p>
        )}

        <div
          className={`refunds-decision-email-status ${String(
            decisionEmailStatus,
          ).toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div>
            <strong>Customer Decision Email</strong>
            <span>Status: {decisionEmailStatus}</span>
            {refund?.decisionEmailSentAt && (
              <span>
                Sent: {formatDate(refund.decisionEmailSentAt)}
              </span>
            )}
            <span>
              Attempts: {refund?.decisionEmailAttempts || 0}
            </span>
          </div>

          {refund?.decisionEmailLastError &&
            decisionEmailStatus === "Failed" && (
              <p>{refund.decisionEmailLastError}</p>
            )}

          <button
            type="button"
            className="refunds-btn secondary"
            onClick={resendDecisionEmail}
            disabled={sendingEmail}
          >
            {sendingEmail
              ? "Sending Email..."
              : decisionEmailStatus === "Sent"
                ? "Resend Decision Email"
                : "Retry Decision Email"}
          </button>
        </div>

        {isApproved && (
          <>
            <div className="refunds-decision-grid">
              <div>
                <strong>Return shipping</strong>
                <span>{refund.returnShippingPayer || "-"}</span>
              </div>
              <div>
                <strong>Seller error</strong>
                <span>{refund.sellerError ? "Yes" : "No"}</span>
              </div>
              <div>
                <strong>Ship-by deadline</strong>
                <span>
                  {refund.returnShippingPayer === "Seller" &&
                  !refund.returnLabelSentAt
                    ? "Begins when label is sent"
                    : formatDate(refund.approvalExpiresAt)}
                </span>
              </div>
              <div>
                <strong>Override used</strong>
                <span>{refund.policyOverrideUsed ? "Yes" : "No"}</span>
              </div>
            </div>

            <div className="refunds-return-address">
              <strong>Return address disclosed after approval</strong>
              {RETURN_ADDRESS.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </>
        )}

        {isDenied && refund?.denialReason && (
          <p>
            <strong>Denial reason:</strong> {refund.denialReason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="refunds-update-panel refunds-decision-panel">
      <div className="refunds-section-heading">
        <div>
          <h4>Eligibility & Admin Decision</h4>
          <p>
            Review the live Shopify delivery information and policy conflicts
            before approving or denying the request.
          </p>
        </div>

        <button
          type="button"
          className="refunds-btn secondary"
          onClick={loadEligibility}
          disabled={loading}
        >
          {loading ? "Checking..." : "Refresh Eligibility"}
        </button>
      </div>

      {eligibility && (
        <>
          <div className="refunds-eligibility-summary">
            <div>
              <strong>Status</strong>
              <span>{eligibility.eligibilityStatus}</span>
            </div>
            <div>
              <strong>Delivered</strong>
              <span>{formatDate(eligibility.deliveredAt)}</span>
            </div>
            <div>
              <strong>30-day deadline</strong>
              <span>{formatDate(eligibility.returnWindowEndsAt)}</span>
            </div>
            <div>
              <strong>Destination</strong>
              <span>
                {eligibility.destinationCountryCode || "Unknown"}
                {eligibility.isInternational ? " — International" : ""}
              </span>
            </div>
            <div>
              <strong>Email match</strong>
              <span>
                {eligibility.customerEmailMatches ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <strong>Duplicate requests</strong>
              <span>{eligibility.duplicateRequestCount || 0}</span>
            </div>
          </div>

          {issueCount > 0 ? (
            <div className="refunds-eligibility-issues">
              {eligibility.issues.map((issue) => (
                <div
                  key={issue.code}
                  className={`refunds-eligibility-issue ${String(
                    issue.severity || "warning",
                  ).toLowerCase()}`}
                >
                  <strong>{issue.code.replace(/_/g, " ")}</strong>
                  <span>{issue.message}</span>
                  {issue.requiresOverride && (
                    <em>Override required for approval</em>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="refunds-email-check is-match">
              No policy conflicts were found.
            </div>
          )}
        </>
      )}

      <div className="refunds-decision-tabs">
        <label>
          <input
            type="radio"
            name="decision"
            value="Approve"
            checked={form.decision === "Approve"}
            onChange={onChange}
          />
          Approve Return
        </label>
        <label>
          <input
            type="radio"
            name="decision"
            value="Deny"
            checked={form.decision === "Deny"}
            onChange={onChange}
          />
          Deny Request
        </label>
      </div>

      {form.decision === "Approve" ? (
        <div className="refunds-decision-form">
          <div className="refunds-filter-group">
            <label htmlFor="returnShippingPayer">
              Return Shipping Payer
            </label>
            <select
              id="returnShippingPayer"
              name="returnShippingPayer"
              value={form.returnShippingPayer}
              onChange={onChange}
            >
              <option value="">Select...</option>
              <option value="Buyer">Buyer Pays</option>
              <option value="Seller">Seller Pays / Pirate Ship Label</option>
              <option value="NoLabel">No Label Required</option>
            </select>
            {isInternational && (
              <small>
                International postage must be buyer-paid unless Admin High
                documents an override.
              </small>
            )}
          </div>

          <div className="refunds-filter-group">
            <label htmlFor="sellerError">Seller Error</label>
            <select
              id="sellerError"
              name="sellerError"
              value={form.sellerError}
              onChange={onChange}
            >
              <option value="">Select...</option>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
            <small>
              Original outbound shipping is refundable only for seller error.
            </small>
          </div>

          <div className="refunds-filter-group full-width">
            <label htmlFor="customerInstructions">
              Customer Return Instructions
            </label>
            <textarea
              id="customerInstructions"
              name="customerInstructions"
              rows="5"
              value={form.customerInstructions}
              onChange={onChange}
            />
          </div>

          {approvalNeedsOverride && (
            <div className="refunds-policy-override full-width">
              <label>
                <input
                  type="checkbox"
                  name="usePolicyOverride"
                  checked={form.usePolicyOverride}
                  onChange={onChange}
                />
                Use Admin High policy override
              </label>

              {form.usePolicyOverride && (
                <textarea
                  name="policyOverrideReason"
                  rows="4"
                  value={form.policyOverrideReason}
                  onChange={onChange}
                  placeholder="Required: explain why the policy rule is being overridden..."
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="refunds-filter-group full-width">
          <label htmlFor="decisionDenialReason">Denial Reason</label>
          <textarea
            id="decisionDenialReason"
            name="denialReason"
            rows="5"
            value={form.denialReason}
            onChange={onChange}
            placeholder="Required customer-facing reason for denial..."
          />
        </div>
      )}

      <div className="refunds-filter-group full-width">
        <label htmlFor="decisionAdminNotes">Admin Notes</label>
        <textarea
          id="decisionAdminNotes"
          name="adminNotes"
          rows="4"
          value={form.adminNotes}
          onChange={onChange}
          placeholder="Internal notes, review details, or decision context..."
        />
      </div>

      <div className="refunds-filter-actions">
        <button
          type="button"
          className={`refunds-btn ${
            form.decision === "Approve" ? "primary" : "danger"
          }`}
          onClick={saveDecision}
          disabled={saving || loading}
        >
          {saving
            ? "Saving Decision..."
            : form.decision === "Approve"
              ? "Approve Return"
              : "Deny Request"}
        </button>
      </div>
    </div>
  );
}

export default AdminRefundDecisionPanel;
