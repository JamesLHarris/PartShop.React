import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";

const initialOptions = {
  includeOriginalShippingRefund: false,
  additionalDeductionAmount: "0.00",
  additionalDeductionReason: "",
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const isOneOf = (value, values) => {
  const normalized = normalize(value);
  return values.some((item) => normalized === normalize(item));
};

const statusClassName = (value) => {
  return normalize(value).replace(/[^a-z0-9]+/g, "-") || "unknown";
};

function AdminRefundFinalizationPanel({
  refund,
  formatDate,
  showApiError,
  onUpdated,
}) {
  const [roleName, setRoleName] = useState(
    localStorage.getItem("userRole") || "",
  );
  const [options, setOptions] = useState(initialOptions);
  const [preview, setPreview] = useState(null);
  const [finalization, setFinalization] = useState(null);

  const [loadingFinalization, setLoadingFinalization] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [retryingInventory, setRetryingInventory] = useState(false);
  const [retryingEmail, setRetryingEmail] = useState(false);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const inspectionComplete =
    normalize(refund?.inspectionStatus) === "completed";
  const isAdminHigh = normalize(roleName) === "adminhigh";

  const currencyCode =
    finalization?.currencyCode || preview?.currencyCode || "USD";

  const finalStatus = normalize(finalization?.status);
  const inventoryStatus = normalize(finalization?.inventoryStatus);
  const emailStatus = normalize(finalization?.completionEmailStatus);

  const shopifyRefundSucceeded = Boolean(
    finalization?.shopifySucceededAt || finalization?.shopifyRefundGid,
  );

  const inventoryNeedsRetry =
    shopifyRefundSucceeded &&
    (finalStatus === "reconciliationrequired" ||
      inventoryStatus === "failed");

  const isCompleted = finalStatus === "completed";

  const canConfirm =
    Boolean(finalization) &&
    isAdminHigh &&
    !isCompleted &&
    !inventoryNeedsRetry &&
    !shopifyRefundSucceeded;

  const canRetryEmail =
    Boolean(finalization) &&
    shopifyRefundSucceeded &&
    isOneOf(finalization?.inventoryStatus, ["Completed", "NotRequired"]) &&
    emailStatus !== "sent";

  const preparedItems = finalization?.items || [];
  const previewItems = preview?.items || [];

  const totalRestock = useMemo(() => {
    const items = preparedItems.length ? preparedItems : previewItems;
    return items.reduce(
      (sum, item) =>
        sum + Number(item.restockQuantitySnapshot ?? item.restockQuantity ?? 0),
      0,
    );
  }, [preparedItems, previewItems]);

  const totalHold = useMemo(() => {
    const items = preparedItems.length ? preparedItems : previewItems;
    return items.reduce(
      (sum, item) =>
        sum + Number(item.holdQuantitySnapshot ?? item.holdQuantity ?? 0),
      0,
    );
  }, [preparedItems, previewItems]);

  const totalDamaged = useMemo(() => {
    const items = preparedItems.length ? preparedItems : previewItems;
    return items.reduce(
      (sum, item) =>
        sum + Number(item.damagedQuantitySnapshot ?? item.damagedQuantity ?? 0),
      0,
    );
  }, [preparedItems, previewItems]);

  const formatMoney = (value, code = currencyCode) => {
    const amount = Number(value || 0);
    const safeCode = String(code || "USD").toUpperCase();

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCode,
      }).format(Number.isFinite(amount) ? amount : 0);
    } catch (error) {
      return `${safeCode} ${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
    }
  };

  const getErrorMessage = (err, fallback) => {
    return (
      err?.response?.data?.errors?.[0] ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      fallback
    );
  };

  const loadFinalization = (silent = false) => {
    if (!refund?.id || !inspectionComplete) {
      setFinalization(null);
      return Promise.resolve(null);
    }

    setLoadingFinalization(true);

    return refundRequestsService
      .getRefundFinalization(refund.id)
      .then((response) => {
        const item = response?.item || null;
        setFinalization(item);

        if (item && !item.shopifySucceededAt) {
          setOptions({
            includeOriginalShippingRefund:
              Number(item.originalShippingRefundAmount || 0) > 0,
            additionalDeductionAmount: Number(
              item.additionalDeductionAmount || 0,
            ).toFixed(2),
            additionalDeductionReason:
              item.additionalDeductionReason || "",
          });
        }

        return item;
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setFinalization(null);
          return null;
        }

        if (!silent) {
          showApiError(err, "Unable to load the final refund record.");
        }

        return null;
      })
      .finally(() => setLoadingFinalization(false));
  };

  useEffect(() => {
    const syncRole = (event) => {
      const eventRole = event?.detail?.user?.roleName;
      setRoleName(eventRole || localStorage.getItem("userRole") || "");
    };

    window.addEventListener("site-auth-changed", syncRole);
    window.addEventListener("storage", syncRole);

    return () => {
      window.removeEventListener("site-auth-changed", syncRole);
      window.removeEventListener("storage", syncRole);
    };
  }, []);

  useEffect(() => {
    setOptions(initialOptions);
    setPreview(null);
    setFinalization(null);
    setShowConfirmation(false);
    setConfirmationText("");

    if (refund?.id && inspectionComplete) {
      loadFinalization(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refund?.id, refund?.inspectionCompletedAt, inspectionComplete]);

  const onOptionChange = (event) => {
    const { name, type, checked, value } = event.target;

    setOptions((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Any changed deduction or shipping choice makes the prior preview stale.
    setPreview(null);
  };

  const buildOptionsPayload = () => {
    const deduction = Number(options.additionalDeductionAmount || 0);
    const reason = options.additionalDeductionReason.trim();

    if (!Number.isFinite(deduction) || deduction < 0) {
      throw new Error("Additional deduction must be zero or greater.");
    }

    if (deduction > 0 && !reason) {
      throw new Error("Enter a written reason for the additional deduction.");
    }

    if (options.includeOriginalShippingRefund && !refund?.sellerError) {
      throw new Error(
        "Original outbound shipping can only be refunded when Seller Error is Yes.",
      );
    }

    return {
      includeOriginalShippingRefund:
        Boolean(options.includeOriginalShippingRefund),
      additionalDeductionAmount: deduction,
      additionalDeductionReason: deduction > 0 ? reason : null,
    };
  };

  const loadPreview = () => {
    let payload;

    try {
      payload = buildOptionsPayload();
    } catch (error) {
      toastr.warning(error.message);
      return;
    }

    setPreviewing(true);

    refundRequestsService
      .getRefundPreview(refund.id, payload)
      .then((response) => {
        const item = response?.item || null;
        setPreview(item);
        toastr.success("Shopify refund preview loaded. No money was moved.");
      })
      .catch((err) => {
        setPreview(null);
        showApiError(err, "Unable to load the Shopify refund preview.");
      })
      .finally(() => setPreviewing(false));
  };

  const prepareFinalization = () => {
    if (!preview) {
      toastr.warning("Load and review the Shopify refund preview first.");
      return;
    }

    let payload;

    try {
      payload = buildOptionsPayload();
    } catch (error) {
      toastr.warning(error.message);
      return;
    }

    setPreparing(true);

    refundRequestsService
      .prepareRefundFinalization(refund.id, payload)
      .then((response) => {
        const item = response?.item || null;
        setFinalization(item);
        toastr.success(
          "Final refund calculation prepared. No money or inventory was moved.",
        );
        if (onUpdated) onUpdated(item);
      })
      .catch((err) => {
        showApiError(err, "Unable to prepare the final refund calculation.");
      })
      .finally(() => setPreparing(false));
  };

  const openConfirmation = () => {
    if (!isAdminHigh) {
      toastr.warning("Only an AdminHigh user may issue the final refund.");
      return;
    }

    if (!finalization) {
      toastr.warning("Prepare the refund calculation first.");
      return;
    }

    setConfirmationText("");
    setShowConfirmation(true);
  };

  const closeConfirmation = () => {
    if (confirming) return;
    setShowConfirmation(false);
    setConfirmationText("");
  };

  const confirmFinalRefund = () => {
    if (confirmationText.trim().toUpperCase() !== "REFUND") {
      toastr.warning('Type "REFUND" to confirm the money-moving action.');
      return;
    }

    setConfirming(true);

    refundRequestsService
      .confirmRefundFinalization(refund.id, {
        confirmMoneyMovement: true,
        confirmationText: "REFUND",
      })
      .then((response) => {
        const item = response?.item || null;
        setFinalization(item);
        setShowConfirmation(false);
        setConfirmationText("");

        if (normalize(item?.inventoryStatus) === "failed") {
          toastr.warning(
            "Shopify refund succeeded, but inventory reconciliation is required.",
          );
        } else if (normalize(item?.completionEmailStatus) === "failed") {
          toastr.warning(
            "Refund and inventory completed, but the completion email failed.",
          );
        } else {
          toastr.success("Shopify refund and inventory commit completed.");
        }

        if (onUpdated) onUpdated(item);
      })
      .catch((err) => {
        const message = getErrorMessage(
          err,
          "Unable to complete the final Shopify refund.",
        );

        toastr.error(message);
        loadFinalization(true);
      })
      .finally(() => setConfirming(false));
  };

  const retryInventoryOnly = () => {
    if (!isAdminHigh) {
      toastr.warning("Only an AdminHigh user may retry inventory reconciliation.");
      return;
    }

    setRetryingInventory(true);

    refundRequestsService
      .retryRefundInventory(refund.id)
      .then((response) => {
        const item = response?.item || null;
        setFinalization(item);
        toastr.success(
          "Inventory reconciliation completed without repeating the refund.",
        );
        if (onUpdated) onUpdated(item);
      })
      .catch((err) => {
        showApiError(
          err,
          "Inventory reconciliation failed again. The refund was not repeated.",
        );
        loadFinalization(true);
      })
      .finally(() => setRetryingInventory(false));
  };

  const retryCompletionEmail = () => {
    setRetryingEmail(true);

    refundRequestsService
      .retryRefundCompletionEmail(refund.id)
      .then((response) => {
        const item = response?.item || null;
        setFinalization(item);
        toastr.success("Refund completion email sent.");
        if (onUpdated) onUpdated(item);
      })
      .catch((err) => {
        showApiError(
          err,
          "The refund remains complete, but the completion email failed.",
        );
        loadFinalization(true);
      })
      .finally(() => setRetryingEmail(false));
  };

  if (!inspectionComplete) {
    return (
      <section className="refunds-section refunds-finalization-panel">
        <div className="refunds-section-heading">
          <div>
            <h4>Final Shopify Refund</h4>
            <p>
              Complete and lock the received-item inspection before preparing
              the final refund.
            </p>
          </div>
          <span className="refunds-finalization-status is-waiting">
            Waiting for inspection
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="refunds-section refunds-finalization-panel">
      <div className="refunds-section-heading refunds-finalization-heading">
        <div>
          <h4>Final Shopify Refund and Inventory Commit</h4>
          <p>
            Review Shopify-authoritative values, save the prepared calculation,
            and use a separate AdminHigh confirmation to move money.
          </p>
        </div>

        <div className="refunds-finalization-heading-actions">
          {loadingFinalization && (
            <span className="refunds-finalization-loading">Loading...</span>
          )}

          <span
            className={`refunds-finalization-status is-${statusClassName(
              finalization?.status || "Not Prepared",
            )}`}
          >
            {finalization?.status || "Not Prepared"}
          </span>
        </div>
      </div>

      <div className="refunds-finalization-access-note">
        <strong>{isAdminHigh ? "AdminHigh" : "AdminLow"}</strong>
        <span>
          {isAdminHigh
            ? "You may review, prepare, issue the refund, and retry inventory."
            : "You may review and prepare the calculation, but only AdminHigh may move money or retry inventory."}
        </span>
      </div>

      {!shopifyRefundSucceeded &&
        !isCompleted &&
        (!finalization || finalStatus === "prepared") && (
        <div className="refunds-finalization-builder">
          <div className="refunds-finalization-builder-grid">
            <label className="refunds-finalization-checkbox">
              <input
                type="checkbox"
                name="includeOriginalShippingRefund"
                checked={options.includeOriginalShippingRefund}
                onChange={onOptionChange}
                disabled={!refund?.sellerError || previewing || preparing}
              />
              <span>
                Refund original outbound shipping
                <small>
                  {refund?.sellerError
                    ? "Allowed because Seller Error is Yes."
                    : "Unavailable because Seller Error is not Yes."}
                </small>
              </span>
            </label>

            <label>
              Additional inspection deduction
              <input
                type="number"
                name="additionalDeductionAmount"
                min="0"
                step="0.01"
                value={options.additionalDeductionAmount}
                onChange={onOptionChange}
                disabled={previewing || preparing}
              />
            </label>

            <label className="full-width">
              Additional deduction reason
              <textarea
                name="additionalDeductionReason"
                rows="3"
                maxLength="1000"
                value={options.additionalDeductionReason}
                onChange={onOptionChange}
                disabled={previewing || preparing}
                placeholder="Required when an additional deduction is greater than $0."
              />
            </label>
          </div>

          <div className="refunds-finalization-builder-actions">
            <button
              type="button"
              className="refunds-btn secondary"
              onClick={loadPreview}
              disabled={previewing || preparing || confirming}
            >
              {previewing ? "Loading Preview..." : "Load Shopify Preview"}
            </button>

            <button
              type="button"
              className="refunds-btn primary"
              onClick={prepareFinalization}
              disabled={!preview || previewing || preparing || confirming}
            >
              {preparing
                ? "Saving Calculation..."
                : finalization
                  ? "Update Prepared Calculation"
                  : "Save Prepared Calculation"}
            </button>
          </div>

          <p className="refunds-finalization-no-side-effect">
            Loading or saving this calculation does not issue a refund, change
            local quantity, change Shopify inventory, or send an email.
          </p>
        </div>
      )}

      {preview && (
        <div className="refunds-finalization-preview">
          <div className="refunds-finalization-subheading">
            <div>
              <strong>Live Shopify Preview</strong>
              <span>
                Loaded {formatDate ? formatDate(preview.previewedAtUtc) : ""}
              </span>
            </div>
            <span className="refunds-finalization-status is-preview">
              Review only
            </span>
          </div>

          <div className="refunds-finalization-money-grid">
            <div>
              <span>Merchandise refund</span>
              <strong>{formatMoney(preview.merchandiseRefundAmount)}</strong>
            </div>
            <div>
              <span>Refundable tax</span>
              <strong>{formatMoney(preview.taxRefundAmount)}</strong>
            </div>
            <div>
              <span>Original shipping refund</span>
              <strong>{formatMoney(preview.originalShippingRefundAmount)}</strong>
            </div>
            <div className="is-deduction">
              <span>Buyer-paid label deduction</span>
              <strong>
                − {formatMoney(preview.buyerPaidLabelDeductionAmount)}
              </strong>
            </div>
            <div className="is-deduction">
              <span>Additional deduction</span>
              <strong>− {formatMoney(preview.additionalDeductionAmount)}</strong>
            </div>
            <div className="is-total">
              <span>Final customer refund</span>
              <strong>{formatMoney(preview.finalRefundAmount)}</strong>
            </div>
          </div>

          <div className="refunds-finalization-limit">
            Shopify maximum remaining refundable amount: {" "}
            <strong>{formatMoney(preview.shopifyMaximumRefundableAmount)}</strong>
          </div>

          <div className="refunds-finalization-preview-items">
            {previewItems.map((item) => (
              <article key={item.refundRequestItemId}>
                <div>
                  <strong>
                    {item.partName || item.shopifyTitle || "Shopify item"}
                  </strong>
                  <span>{item.partNumber || item.shopifySku || "No SKU"}</span>
                </div>
                <div>
                  <span>Refund qty</span>
                  <strong>{item.quantityToRefund}</strong>
                </div>
                <div>
                  <span>Shopify remaining</span>
                  <strong>{item.shopifyRefundableQuantity}</strong>
                </div>
                <div>
                  <span>Item + tax</span>
                  <strong>
                    {formatMoney(item.shopifyTotalAmount, item.currencyCode)}
                  </strong>
                </div>
              </article>
            ))}
          </div>

          {preview.suggestedTransactions?.length > 0 && (
            <div className="refunds-finalization-transaction-list">
              {preview.suggestedTransactions.map((transaction, index) => (
                <div key={`${transaction.kind}-${index}`}>
                  <span>
                    {transaction.formattedGateway ||
                      transaction.gateway ||
                      "Original payment method"}
                  </span>
                  <strong>
                    {formatMoney(transaction.amount, transaction.currencyCode)}
                  </strong>
                  <small>{transaction.kind || "Refund"}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {finalization && (
        <>
          <div className="refunds-finalization-prepared">
            <div className="refunds-finalization-subheading">
              <div>
                <strong>Saved Final Refund</strong>
                <span>
                  Revision {finalization.preparedRevision || 1} prepared by {" "}
                  {finalization.preparedByName ||
                    `User ${finalization.preparedByUserId}`}{" "}
                  on {formatDate ? formatDate(finalization.preparedAt) : "-"}
                </span>
              </div>
              <span
                className={`refunds-finalization-status is-${statusClassName(
                  finalization.status,
                )}`}
              >
                {finalization.status}
              </span>
            </div>

            <div className="refunds-finalization-money-grid">
              <div>
                <span>Merchandise refund</span>
                <strong>
                  {formatMoney(finalization.merchandiseRefundAmount)}
                </strong>
              </div>
              <div>
                <span>Refundable tax</span>
                <strong>{formatMoney(finalization.taxRefundAmount)}</strong>
              </div>
              <div>
                <span>Original shipping refund</span>
                <strong>
                  {formatMoney(finalization.originalShippingRefundAmount)}
                </strong>
              </div>
              <div className="is-deduction">
                <span>Buyer-paid label deduction</span>
                <strong>
                  − {formatMoney(finalization.buyerPaidLabelDeductionAmount)}
                </strong>
              </div>
              <div className="is-deduction">
                <span>Additional deduction</span>
                <strong>
                  − {formatMoney(finalization.additionalDeductionAmount)}
                </strong>
              </div>
              <div className="is-total">
                <span>Final customer refund</span>
                <strong>{formatMoney(finalization.finalRefundAmount)}</strong>
              </div>
            </div>

            <div className="refunds-finalization-limit">
              Shopify maximum remaining refundable amount: {" "}
              <strong>
                {formatMoney(finalization.shopifyMaximumRefundableAmount)}
              </strong>
            </div>

            {finalization.additionalDeductionAmount > 0 && (
              <div className="refunds-finalization-deduction-reason">
                <strong>Additional deduction reason</strong>
                <span>{finalization.additionalDeductionReason}</span>
              </div>
            )}

            <div className="refunds-finalization-commit-summary">
              <div>
                <strong>{totalRestock}</strong>
                <span>Restock after refund</span>
              </div>
              <div>
                <strong>{totalHold}</strong>
                <span>Remain unavailable</span>
              </div>
              <div>
                <strong>{totalDamaged}</strong>
                <span>Damaged / not restocked</span>
              </div>
            </div>
          </div>

          <div className="refunds-finalization-item-list">
            <div className="refunds-finalization-subheading">
              <div>
                <strong>Refunded Items and Inventory Commit</strong>
                <span>
                  Only the saved restock bucket becomes saleable inventory.
                </span>
              </div>
            </div>

            {preparedItems.map((item) => (
              <article key={item.id || item.refundRequestItemId}>
                <div className="refunds-finalization-item-heading">
                  <div>
                    <strong>
                      {item.partName ||
                        (item.partId ? `Part ${item.partId}` : "Shopify item")}
                    </strong>
                    <span>{item.partNumber || "No part number"}</span>
                  </div>
                  <span className="refunds-finalization-item-amount">
                    {formatMoney(item.itemRefundAmount, item.currencyCode)}
                  </span>
                </div>

                <div className="refunds-finalization-item-grid">
                  <div>
                    <span>Refund quantity</span>
                    <strong>{item.refundQuantity}</strong>
                  </div>
                  <div>
                    <span>Restock</span>
                    <strong>{item.restockQuantitySnapshot}</strong>
                  </div>
                  <div>
                    <span>Hold</span>
                    <strong>{item.holdQuantitySnapshot}</strong>
                  </div>
                  <div>
                    <span>Damaged</span>
                    <strong>{item.damagedQuantitySnapshot}</strong>
                  </div>
                </div>

                <div className="refunds-finalization-inventory-grid">
                  <div>
                    <span>Local inventory</span>
                    <strong>{item.localInventoryStatus || "Pending"}</strong>
                    {item.localQuantityBefore !== null &&
                      item.localQuantityBefore !== undefined && (
                        <small>
                          {item.localQuantityBefore} → {item.localQuantityAfter}
                        </small>
                      )}
                    {item.localInventoryLastError && (
                      <small className="is-error">
                        {item.localInventoryLastError}
                      </small>
                    )}
                  </div>
                  <div>
                    <span>Shopify inventory</span>
                    <strong>{item.shopifyInventoryStatus || "Pending"}</strong>
                    <small>
                      Attempts: {item.shopifyInventoryAttemptCount || 0}
                    </small>
                    {item.shopifyInventoryLastError && (
                      <small className="is-error">
                        {item.shopifyInventoryLastError}
                      </small>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="refunds-finalization-state-grid">
            <div>
              <span>Shopify refund</span>
              <strong>
                {finalization.shopifySucceededAt ? "Confirmed" : "Not completed"}
              </strong>
              <small>
                {finalization.actualRefundedAmount !== null &&
                finalization.actualRefundedAmount !== undefined
                  ? formatMoney(finalization.actualRefundedAmount)
                  : "No funds confirmed yet"}
              </small>
              {finalization.shopifyTransactionStatus && (
                <small>
                  Transaction: {finalization.shopifyTransactionStatus}
                </small>
              )}
            </div>
            <div>
              <span>Inventory</span>
              <strong>{finalization.inventoryStatus || "Pending"}</strong>
              <small>
                Attempts: {finalization.inventoryAttemptCount || 0}
              </small>
              {finalization.inventoryLastError && (
                <small className="is-error">
                  {finalization.inventoryLastError}
                </small>
              )}
            </div>
            <div>
              <span>Completion email</span>
              <strong>
                {finalization.completionEmailStatus || "NotAttempted"}
              </strong>
              <small>
                Attempts: {finalization.completionEmailAttempts || 0}
              </small>
              {finalization.completionEmailLastError && (
                <small className="is-error">
                  {finalization.completionEmailLastError}
                </small>
              )}
            </div>
          </div>

          {finalization.lastError && (
            <div className="refunds-finalization-error" role="alert">
              <strong>Action required</strong>
              <span>{finalization.lastError}</span>
            </div>
          )}

          <div className="refunds-finalization-actions">
            {canConfirm && (
              <button
                type="button"
                className="refunds-btn danger"
                onClick={openConfirmation}
                disabled={confirming || preparing || previewing}
              >
                {finalStatus === "prepared"
                  ? "Issue Final Shopify Refund"
                  : "Retry Final Refund Safely"}
              </button>
            )}

            {!isAdminHigh && !isCompleted && !shopifyRefundSucceeded && (
              <div className="refunds-finalization-adminhigh-required">
                AdminHigh confirmation is required to move money.
              </div>
            )}

            {inventoryNeedsRetry && (
              <button
                type="button"
                className="refunds-btn danger"
                onClick={retryInventoryOnly}
                disabled={!isAdminHigh || retryingInventory}
                title={
                  isAdminHigh
                    ? "Retry inventory only. The Shopify refund will not repeat."
                    : "AdminHigh is required."
                }
              >
                {retryingInventory
                  ? "Retrying Inventory..."
                  : "Retry Inventory Only"}
              </button>
            )}

            {canRetryEmail && (
              <button
                type="button"
                className="refunds-btn secondary"
                onClick={retryCompletionEmail}
                disabled={retryingEmail}
              >
                {retryingEmail
                  ? "Sending Email..."
                  : "Retry Completion Email Only"}
              </button>
            )}

            <button
              type="button"
              className="refunds-btn secondary"
              onClick={() => loadFinalization(false)}
              disabled={loadingFinalization}
            >
              Reload Finalization
            </button>
          </div>
        </>
      )}

      {finalization?.events?.length > 0 && (
        <div className="refunds-finalization-history">
          <div className="refunds-finalization-subheading">
            <div>
              <strong>Final Refund Audit History</strong>
              <span>
                Preparation, refund, inventory, retry, and email events.
              </span>
            </div>
          </div>

          <div className="refunds-finalization-event-list">
            {finalization.events.map((event) => (
              <div key={event.id}>
                <strong>{event.eventType}</strong>
                <span>{event.status || "-"}</span>
                <span>
                  {formatDate ? formatDate(event.dateCreated) : event.dateCreated}
                </span>
                {event.createdByName && (
                  <span>By {event.createdByName}</span>
                )}
                {event.message && <p>{event.message}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {showConfirmation && (
        <div
          className="refunds-modal-overlay refunds-finalization-confirm-overlay"
          onClick={closeConfirmation}
        >
          <div
            className="refunds-modal refunds-finalization-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="refunds-modal-header">
              <div>
                <p className="refunds-finalization-confirm-eyebrow">
                  AdminHigh financial action
                </p>
                <h3>Issue Final Shopify Refund</h3>
              </div>
              <button
                type="button"
                className="refunds-btn secondary"
                onClick={closeConfirmation}
                disabled={confirming}
              >
                Cancel
              </button>
            </div>

            <div className="refunds-finalization-confirm-warning">
              <strong>This action moves real money.</strong>
              <p>
                Shopify will refund {formatMoney(finalization.finalRefundAmount)}
                to the original payment method. After Shopify confirms success,
                Site_2024 will add only {totalRestock} inspected restock unit(s)
                to saleable inventory. Hold and damaged quantities will not be
                restocked.
              </p>
            </div>

            <label className="refunds-finalization-confirm-field">
              Type <strong>REFUND</strong> to confirm
              <input
                type="text"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                autoComplete="off"
                disabled={confirming}
                autoFocus
              />
            </label>

            <div className="refunds-finalization-confirm-actions">
              <button
                type="button"
                className="refunds-btn secondary"
                onClick={closeConfirmation}
                disabled={confirming}
              >
                Go Back
              </button>
              <button
                type="button"
                className="refunds-btn danger"
                onClick={confirmFinalRefund}
                disabled={
                  confirming ||
                  confirmationText.trim().toUpperCase() !== "REFUND"
                }
              >
                {confirming ? "Issuing Refund..." : "Confirm and Move Money"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminRefundFinalizationPanel;
