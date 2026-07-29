import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";

const ACTIONS = {
  ReleaseToInventory: {
    label: "Release to Inventory",
    source: "hold",
    button: "Release to Inventory",
    description:
      "Adds the selected held quantity to local saleable inventory and synchronizes Shopify.",
  },
  MoveHoldToDamaged: {
    label: "Move Hold to Damaged",
    source: "hold",
    button: "Move to Damaged",
    description:
      "Removes the selected quantity from hold and places it in the damaged bucket. No inventory is added.",
  },
  WriteOffDamaged: {
    label: "Write Off Damaged",
    source: "damaged",
    button: "Write Off Damaged",
    description:
      "Permanently resolves the selected damaged quantity as a write-off. No inventory is added.",
  },
  RetainForParts: {
    label: "Retain for Parts",
    source: "damaged",
    button: "Retain for Parts",
    description:
      "Resolves the selected damaged quantity as retained for internal parts use. No inventory is added.",
  },
  DisposeDamaged: {
    label: "Dispose Damaged",
    source: "damaged",
    button: "Dispose Damaged",
    description:
      "Permanently resolves the selected damaged quantity as disposed. No inventory is added.",
  },
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const statusClassName = (value) => {
  return normalize(value).replace(/[^a-z0-9]+/g, "-") || "unknown";
};

const actionLabel = (value) => ACTIONS[value]?.label || value || "Action";

const createIdempotencyKey = (refundRequestId, dispositionItemId) => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `site-2024-disposition-${refundRequestId}-${dispositionItemId}-${timestamp}-${randomPart}`;
};

const getAvailableActions = (item) => {
  const actions = [];

  if (Number(item?.holdRemainingQuantity || 0) > 0) {
    actions.push("ReleaseToInventory", "MoveHoldToDamaged");
  }

  if (Number(item?.damagedRemainingQuantity || 0) > 0) {
    actions.push("WriteOffDamaged", "RetainForParts", "DisposeDamaged");
  }

  return actions;
};

const getAvailableQuantity = (item, actionType) => {
  const source = ACTIONS[actionType]?.source;

  if (source === "hold") {
    return Number(item?.holdRemainingQuantity || 0);
  }

  if (source === "damaged") {
    return Number(item?.damagedRemainingQuantity || 0);
  }

  return 0;
};

const createFormForItem = (refundRequestId, item, previous) => {
  const allowedActions = getAvailableActions(item);
  const previousAction = previous?.actionType;
  const actionType = allowedActions.includes(previousAction)
    ? previousAction
    : allowedActions[0] || "";

  const availableQuantity = getAvailableQuantity(item, actionType);
  const previousQuantity = Number(previous?.quantity || 1);
  const safeQuantity = Math.min(
    Math.max(Number.isInteger(previousQuantity) ? previousQuantity : 1, 1),
    Math.max(availableQuantity, 1),
  );

  return {
    actionType,
    quantity: String(safeQuantity),
    reason: previous?.reason || "",
    idempotencyKey:
      previous?.idempotencyKey ||
      createIdempotencyKey(refundRequestId, item.id),
  };
};

function AdminRefundInventoryDispositionPanel({
  refund,
  formatDate,
  showApiError,
  onUpdated,
}) {
  const [roleName, setRoleName] = useState(
    localStorage.getItem("userRole") || "",
  );
  const [disposition, setDisposition] = useState(null);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(false);
  const [submittingItemId, setSubmittingItemId] = useState(null);
  const [retryingActionId, setRetryingActionId] = useState(null);
  const [loadMessage, setLoadMessage] = useState("");

  const isAdminHigh = normalize(roleName) === "adminhigh";

  const items = disposition?.items || [];
  const actions = disposition?.actions || [];
  const events = disposition?.events || [];

  const unresolvedQuantity = useMemo(() => {
    return (
      Number(disposition?.holdRemainingQuantity || 0) +
      Number(disposition?.damagedRemainingQuantity || 0)
    );
  }, [
    disposition?.holdRemainingQuantity,
    disposition?.damagedRemainingQuantity,
  ]);

  const resolvedDamagedQuantity = useMemo(() => {
    return (
      Number(disposition?.writtenOffQuantity || 0) +
      Number(disposition?.retainedForPartsQuantity || 0) +
      Number(disposition?.disposedQuantity || 0)
    );
  }, [
    disposition?.writtenOffQuantity,
    disposition?.retainedForPartsQuantity,
    disposition?.disposedQuantity,
  ]);

  const syncForms = (nextDisposition, resetItemId = null) => {
    const nextItems = nextDisposition?.items || [];

    setForms((current) => {
      const next = {};

      nextItems.forEach((item) => {
        const previous = resetItemId === item.id ? null : current[item.id];
        next[item.id] = createFormForItem(
          nextDisposition.refundRequestId,
          item,
          previous,
        );
      });

      return next;
    });
  };

  const loadDisposition = (silent = false) => {
    if (!refund?.id) {
      setDisposition(null);
      setForms({});
      setLoadMessage("");
      return Promise.resolve(null);
    }

    setLoading(true);
    setLoadMessage("");

    return refundRequestsService
      .getRefundInventoryDispositions(refund.id)
      .then((response) => {
        const item = response?.item || null;
        setDisposition(item);
        syncForms(item);
        return item;
      })
      .catch((err) => {
        setDisposition(null);
        setForms({});

        if (err?.response?.status === 404) {
          setLoadMessage("No held or damaged inventory requires follow-up.");
          return null;
        }

        if (err?.response?.status === 400) {
          const message =
            err?.response?.data?.errors?.[0] ||
            err?.response?.data?.message ||
            "Held and damaged inventory is not available for this return.";
          setLoadMessage(message);
          return null;
        }

        if (!silent) {
          showApiError(
            err,
            "Unable to load the held and damaged inventory resolution state.",
          );
        }

        return null;
      })
      .finally(() => setLoading(false));
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
    setDisposition(null);
    setForms({});
    setLoadMessage("");

    if (refund?.id) {
      loadDisposition(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refund?.id]);

  const updateForm = (item, field, value) => {
    setForms((current) => {
      const previous = current[item.id] || createFormForItem(refund.id, item);
      const next = {
        ...previous,
        [field]: value,
        idempotencyKey: createIdempotencyKey(refund.id, item.id),
      };

      if (field === "actionType") {
        next.quantity = "1";
        next.reason = "";
      }

      return {
        ...current,
        [item.id]: next,
      };
    });
  };

  const validateAction = (item, form) => {
    if (!form?.actionType || !ACTIONS[form.actionType]) {
      throw new Error("Select a held or damaged inventory action.");
    }

    const quantity = Number(form.quantity);
    const availableQuantity = getAvailableQuantity(item, form.actionType);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be a whole number of at least 1.");
    }

    if (quantity > availableQuantity) {
      throw new Error(
        `Only ${availableQuantity} unit(s) are available for this action.`,
      );
    }

    const reason = String(form.reason || "").trim();

    if (!reason) {
      throw new Error("Enter a documented reason for this inventory action.");
    }

    return {
      actionType: form.actionType,
      quantity,
      reason,
      idempotencyKey: form.idempotencyKey,
    };
  };

  const executeAction = (item) => {
    if (!isAdminHigh) {
      toastr.warning(
        "Only an AdminHigh user may resolve held or damaged inventory.",
      );
      return;
    }

    const form = forms[item.id];
    let payload;

    try {
      payload = validateAction(item, form);
    } catch (error) {
      toastr.warning(error.message);
      return;
    }

    const action = ACTIONS[payload.actionType];
    const confirmationText =
      payload.actionType === "ReleaseToInventory"
        ? `Release ${payload.quantity} unit(s) to saleable inventory? This will increase local and Shopify inventory.`
        : `${action.label} for ${payload.quantity} unit(s)? This action will not add saleable inventory.`;

    if (!window.confirm(confirmationText)) {
      return;
    }

    setSubmittingItemId(item.id);

    refundRequestsService
      .executeRefundInventoryDispositionAction(refund.id, item.id, payload)
      .then((response) => {
        const nextDisposition = response?.item || null;
        setDisposition(nextDisposition);
        syncForms(nextDisposition, item.id);

        const completedAction = (nextDisposition?.actions || []).find(
          (entry) => entry.idempotencyKey === payload.idempotencyKey,
        );

        if (
          normalize(completedAction?.status) === "reconciliationrequired" ||
          normalize(completedAction?.shopifyInventoryStatus) === "failed"
        ) {
          toastr.warning(
            "Local inventory was updated, but Shopify reconciliation is required. Use Retry Shopify Sync below.",
          );
        } else {
          toastr.success(`${action.label} completed.`);
        }

        if (onUpdated) onUpdated(nextDisposition);
      })
      .catch((err) => {
        showApiError(
          err,
          "Unable to complete the held or damaged inventory action.",
        );
      })
      .finally(() => setSubmittingItemId(null));
  };

  const isRetryableAction = (action) => {
    return (
      ["failed", "reconciliationrequired"].includes(
        normalize(action?.status),
      ) ||
      normalize(action?.localInventoryStatus) === "failed" ||
      normalize(action?.shopifyInventoryStatus) === "failed"
    );
  };

  const retryAction = (action) => {
    if (!isAdminHigh) {
      toastr.warning(
        "Only an AdminHigh user may retry an inventory resolution action.",
      );
      return;
    }

    setRetryingActionId(action.id);

    refundRequestsService
      .retryRefundInventoryDispositionAction(refund.id, action.id)
      .then((response) => {
        const nextDisposition = response?.item || null;
        setDisposition(nextDisposition);
        syncForms(nextDisposition);

        const refreshedAction = (nextDisposition?.actions || []).find(
          (entry) => Number(entry.id) === Number(action.id),
        );

        if (isRetryableAction(refreshedAction)) {
          toastr.warning(
            "The action still requires reconciliation. Review the latest error before retrying again.",
          );
        } else {
          toastr.success("Inventory resolution retry completed.");
        }

        if (onUpdated) onUpdated(nextDisposition);
      })
      .catch((err) => {
        showApiError(err, "Unable to retry the inventory resolution action.");
      })
      .finally(() => setRetryingActionId(null));
  };

  if (!refund?.id) {
    return null;
  }

  return (
    <section className="refunds-section refunds-disposition-panel">
      <div className="refunds-section-heading refunds-disposition-heading">
        <div>
          <h4>Held and Damaged Inventory</h4>
          <p>
            Resolve units that were intentionally excluded from the original
            Step 34 restock. Only released held units become saleable.
          </p>
        </div>

        <div className="refunds-disposition-heading-actions">
          {disposition ? (
            <span
              className={`refunds-disposition-status is-${statusClassName(
                disposition.status,
              )}`}
            >
              {disposition.status || "Unknown"}
            </span>
          ) : null}

          <button
            type="button"
            className="refunds-btn secondary small"
            onClick={() => loadDisposition(false)}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {!isAdminHigh ? (
        <div className="refunds-disposition-access-note">
          <strong>AdminLow view only</strong>
          <span>
            AdminHigh authorization is required to release, reclassify, write
            off, retain, dispose, or retry inventory actions.
          </span>
        </div>
      ) : null}

      {loading && !disposition ? (
        <div className="refunds-disposition-loading">
          Loading held and damaged inventory...
        </div>
      ) : loadMessage && !disposition ? (
        <div className="refunds-empty compact">{loadMessage}</div>
      ) : !disposition ? (
        <div className="refunds-empty compact">
          No held or damaged inventory state was returned.
        </div>
      ) : (
        <>
          <div className="refunds-disposition-summary-grid">
            <div>
              <span>Initial Hold</span>
              <strong>{disposition.initialHoldQuantity || 0}</strong>
            </div>
            <div>
              <span>Initial Damaged</span>
              <strong>{disposition.initialDamagedQuantity || 0}</strong>
            </div>
            <div className="is-warning">
              <span>Hold Remaining</span>
              <strong>{disposition.holdRemainingQuantity || 0}</strong>
            </div>
            <div className="is-danger">
              <span>Damaged Remaining</span>
              <strong>{disposition.damagedRemainingQuantity || 0}</strong>
            </div>
            <div className="is-success">
              <span>Released to Inventory</span>
              <strong>{disposition.releasedToInventoryQuantity || 0}</strong>
            </div>
            <div>
              <span>Damaged Resolved</span>
              <strong>{resolvedDamagedQuantity}</strong>
            </div>
          </div>

          <div
            className={`refunds-disposition-balance-note ${
              unresolvedQuantity === 0 ? "is-complete" : "is-open"
            }`}
          >
            <strong>
              {unresolvedQuantity === 0
                ? "All held and damaged units are resolved."
                : `${unresolvedQuantity} unit(s) still require resolution.`}
            </strong>
            <span>
              Hold-to-damaged transfers remain non-saleable until a final
              damaged disposition is recorded.
            </span>
          </div>

          <div className="refunds-disposition-items">
            {items.map((item) => {
              const allowedActions = getAvailableActions(item);
              const form = forms[item.id] || createFormForItem(refund.id, item);
              const selectedAction = ACTIONS[form.actionType];
              const availableQuantity = getAvailableQuantity(
                item,
                form.actionType,
              );
              const itemResolved = allowedActions.length === 0;

              return (
                <article key={item.id} className="refunds-disposition-item-card">
                  <div className="refunds-disposition-item-heading">
                    <div>
                      <strong>{item.partName || `Part ${item.partId || "-"}`}</strong>
                      <span>
                        Part / SKU: {item.partNumber || "-"}
                        {item.partId ? ` · Site Part #${item.partId}` : ""}
                      </span>
                    </div>
                    <span
                      className={`refunds-disposition-status is-${statusClassName(
                        item.status,
                      )}`}
                    >
                      {item.status || (itemResolved ? "Resolved" : "Open")}
                    </span>
                  </div>

                  <div className="refunds-disposition-item-grid">
                    <div>
                      <span>Initial Hold</span>
                      <strong>{item.initialHoldQuantity || 0}</strong>
                    </div>
                    <div>
                      <span>Hold Remaining</span>
                      <strong>{item.holdRemainingQuantity || 0}</strong>
                    </div>
                    <div>
                      <span>Initial Damaged</span>
                      <strong>{item.initialDamagedQuantity || 0}</strong>
                    </div>
                    <div>
                      <span>Damaged Remaining</span>
                      <strong>{item.damagedRemainingQuantity || 0}</strong>
                    </div>
                    <div>
                      <span>Released</span>
                      <strong>{item.releasedToInventoryQuantity || 0}</strong>
                    </div>
                    <div>
                      <span>Moved to Damaged</span>
                      <strong>{item.convertedHoldToDamagedQuantity || 0}</strong>
                    </div>
                    <div>
                      <span>Written Off</span>
                      <strong>{item.writtenOffQuantity || 0}</strong>
                    </div>
                    <div>
                      <span>Retained / Disposed</span>
                      <strong>
                        {Number(item.retainedForPartsQuantity || 0) +
                          Number(item.disposedQuantity || 0)}
                      </strong>
                    </div>
                  </div>

                  {itemResolved ? (
                    <div className="refunds-disposition-item-complete">
                      This item has no remaining held or damaged quantity.
                    </div>
                  ) : isAdminHigh ? (
                    <div className="refunds-disposition-action-builder">
                      <div className="refunds-disposition-action-grid">
                        <label>
                          Action
                          <select
                            value={form.actionType}
                            onChange={(event) =>
                              updateForm(item, "actionType", event.target.value)
                            }
                            disabled={submittingItemId === item.id}
                          >
                            {allowedActions.map((actionType) => (
                              <option key={actionType} value={actionType}>
                                {actionLabel(actionType)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Quantity
                          <input
                            type="number"
                            min="1"
                            max={Math.max(availableQuantity, 1)}
                            step="1"
                            value={form.quantity}
                            onChange={(event) =>
                              updateForm(item, "quantity", event.target.value)
                            }
                            disabled={submittingItemId === item.id}
                          />
                          <small>{availableQuantity} available for this action</small>
                        </label>

                        <label className="full-width">
                          Documented Reason
                          <textarea
                            rows="3"
                            maxLength="2000"
                            value={form.reason}
                            onChange={(event) =>
                              updateForm(item, "reason", event.target.value)
                            }
                            placeholder="Explain why this held or damaged quantity is being resolved this way."
                            disabled={submittingItemId === item.id}
                          />
                        </label>
                      </div>

                      <div className="refunds-disposition-action-footer">
                        <p>{selectedAction?.description}</p>
                        <button
                          type="button"
                          className={`refunds-btn ${
                            form.actionType === "ReleaseToInventory"
                              ? "primary"
                              : "danger"
                          }`}
                          onClick={() => executeAction(item)}
                          disabled={submittingItemId === item.id}
                        >
                          {submittingItemId === item.id
                            ? "Processing..."
                            : selectedAction?.button || "Complete Action"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="refunds-disposition-item-view-only">
                      AdminHigh must perform the next inventory resolution action.
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="refunds-disposition-history-card">
            <div className="refunds-disposition-subheading">
              <div>
                <strong>Resolution Actions</strong>
                <span>
                  Each saved action has its own idempotency key and independent
                  local and Shopify status.
                </span>
              </div>
              <span>{actions.length} action(s)</span>
            </div>

            {actions.length === 0 ? (
              <div className="refunds-empty compact">
                No held or damaged inventory actions have been recorded.
              </div>
            ) : (
              <div className="refunds-disposition-action-list">
                {actions.map((action) => {
                  const retryable = isRetryableAction(action);
                  const shopifyOnlyRetry =
                    normalize(action.localInventoryStatus) === "completed" &&
                    normalize(action.shopifyInventoryStatus) === "failed";

                  return (
                    <article key={action.id}>
                      <div className="refunds-disposition-action-heading">
                        <div>
                          <strong>{actionLabel(action.actionType)}</strong>
                          <span>
                            Quantity {action.quantity} · Action #{action.id}
                          </span>
                        </div>
                        <span
                          className={`refunds-disposition-status is-${statusClassName(
                            action.status,
                          )}`}
                        >
                          {action.status || "Unknown"}
                        </span>
                      </div>

                      <p className="refunds-disposition-action-reason">
                        {action.reason || "No reason recorded."}
                      </p>

                      <div className="refunds-disposition-action-state-grid">
                        <div>
                          <span>Local Inventory</span>
                          <strong>{action.localInventoryStatus || "-"}</strong>
                          {action.localQuantityBefore !== null &&
                          action.localQuantityBefore !== undefined ? (
                            <small>
                              {action.localQuantityBefore} → {action.localQuantityAfter}
                            </small>
                          ) : null}
                        </div>
                        <div>
                          <span>Shopify Inventory</span>
                          <strong>{action.shopifyInventoryStatus || "-"}</strong>
                          <small>
                            Attempts: {action.shopifyInventoryAttemptCount || 0}
                          </small>
                        </div>
                        <div>
                          <span>Prepared By</span>
                          <strong>{action.preparedByName || `User ${action.preparedByUserId}`}</strong>
                          <small>{formatDate(action.preparedAt)}</small>
                        </div>
                        <div>
                          <span>Completed</span>
                          <strong>{formatDate(action.completedAt)}</strong>
                        </div>
                      </div>

                      {action.lastError || action.shopifyInventoryLastError ? (
                        <div className="refunds-disposition-error">
                          <strong>Latest Error</strong>
                          <span>
                            {action.shopifyInventoryLastError || action.lastError}
                          </span>
                        </div>
                      ) : null}

                      {retryable ? (
                        <div className="refunds-disposition-action-retry">
                          <button
                            type="button"
                            className="refunds-btn warning small"
                            onClick={() => retryAction(action)}
                            disabled={
                              !isAdminHigh || retryingActionId === action.id
                            }
                          >
                            {retryingActionId === action.id
                              ? "Retrying..."
                              : shopifyOnlyRetry
                                ? "Retry Shopify Sync"
                                : "Retry Action"}
                          </button>
                          {!isAdminHigh ? (
                            <span>AdminHigh authorization required.</span>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <details className="refunds-disposition-audit">
            <summary>Disposition Audit History ({events.length})</summary>
            {events.length === 0 ? (
              <div className="refunds-empty compact">
                No disposition events have been recorded.
              </div>
            ) : (
              <div className="refunds-disposition-event-list">
                {events.map((event) => (
                  <div key={event.id}>
                    <strong>{event.eventType || "Event"}</strong>
                    <span>{event.status || "-"}</span>
                    <span>{event.createdByName || "System"}</span>
                    <span>{formatDate(event.dateCreated)}</span>
                    {event.message ? <p>{event.message}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </details>
        </>
      )}
    </section>
  );
}

export default AdminRefundInventoryDispositionPanel;
