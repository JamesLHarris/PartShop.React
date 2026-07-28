import React, { useEffect, useState } from "react";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";

const toDateTimeLocalValue = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toNonNegativeInteger = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 0;

  return Math.max(0, Math.trunc(parsed));
};

const getSavedBucketValue = (item, field) => {
  const directValue = item?.[field];

  if (directValue !== null && directValue !== undefined) {
    return toNonNegativeInteger(directValue);
  }

  const received = toNonNegativeInteger(item?.quantityReceived);
  const legacyRestock = toNonNegativeInteger(
    item?.proposedRestockQuantity,
  );

  if (field === "restockQuantity") {
    return legacyRestock;
  }

  if (field === "damagedQuantity") {
    return item?.inventoryDisposition === "DamagedNoRestock"
      ? received
      : 0;
  }

  if (field === "holdQuantity") {
    if (
      item?.inventoryDisposition === "HoldUnavailable" ||
      item?.inventoryDisposition === "NoInventoryChange"
    ) {
      return received;
    }

    return Math.max(0, received - legacyRestock);
  }

  return 0;
};

const buildInspectionItems = (items = []) => {
  return items.map((item) => {
    const received = toNonNegativeInteger(item.quantity || 1);

    return {
      refundRequestItemId: item.id,
      quantityReceived: received,
      isSameItem: true,
      isComplete: true,
      isAltered: false,
      hasNewDamage: false,
      inspectionNotes: "",
      restockQuantity: 0,
      holdQuantity: received,
      damagedQuantity: 0,
    };
  });
};

function AdminRefundInspectionPanel({
  refund,
  formatDate,
  showApiError,
  onUpdated,
}) {
  const status = String(refund?.status || refund?.statusName || "");
  const approved = status.toLowerCase() === "approved";
  const received = Boolean(refund?.itemReceivedAt);
  const completed =
    String(refund?.inspectionStatus || "").toLowerCase() === "completed";

  const [receiving, setReceiving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    receivedAt: toDateTimeLocalValue(),
    notes: "",
  });
  const [inspectionSummary, setInspectionSummary] = useState("");
  const [inspectionItems, setInspectionItems] = useState([]);

  useEffect(() => {
    setReceiveForm({
      receivedAt: toDateTimeLocalValue(refund?.itemReceivedAt),
      notes: refund?.itemReceivedNotes || "",
    });

    setInspectionSummary(refund?.inspectionSummary || "");

    if (completed) {
      setInspectionItems(
        (refund?.items || []).map((item) => ({
          refundRequestItemId: item.id,
          quantityReceived: Number(item.quantityReceived || 0),
          isSameItem: item.isSameItem === true,
          isComplete: item.isComplete === true,
          isAltered: item.isAltered === true,
          hasNewDamage: item.hasNewDamage === true,
          inspectionNotes: item.inspectionNotes || "",
          restockQuantity: getSavedBucketValue(
            item,
            "restockQuantity",
          ),
          holdQuantity: getSavedBucketValue(
            item,
            "holdQuantity",
          ),
          damagedQuantity: getSavedBucketValue(
            item,
            "damagedQuantity",
          ),
        })),
      );
    } else {
      setInspectionItems(buildInspectionItems(refund?.items || []));
    }
  }, [refund, completed]);

  if (!approved && !received && !completed) {
    return null;
  }

  const onReceiveChange = (event) => {
    const { name, value } = event.target;
    setReceiveForm((current) => ({ ...current, [name]: value }));
  };

  const markReceived = () => {
    if (!refund?.id) return;

    setReceiving(true);

    refundRequestsService
      .markReturnItemReceived(refund.id, {
        receivedAt: receiveForm.receivedAt
          ? new Date(receiveForm.receivedAt).toISOString()
          : null,
        notes: receiveForm.notes.trim() || null,
      })
      .then((response) => {
        toastr.success("Returned item marked received.");
        onUpdated?.(response?.item || refund);
      })
      .catch((error) => {
        showApiError(error, "Unable to mark the return received.");
      })
      .finally(() => setReceiving(false));
  };

  const changeInspectionItem = (itemId, field, value) => {
    setInspectionItems((current) =>
      current.map((item) => {
        if (item.refundRequestItemId !== itemId) return item;

        const next = {
          ...item,
          [field]:
            field === "quantityReceived" ||
            field === "restockQuantity" ||
            field === "holdQuantity" ||
            field === "damagedQuantity"
              ? toNonNegativeInteger(value)
              : value,
        };

        if (field === "quantityReceived") {
          const newReceived = toNonNegativeInteger(value);
          let restock = toNonNegativeInteger(
            next.restockQuantity,
          );
          let hold = toNonNegativeInteger(next.holdQuantity);
          let damaged = toNonNegativeInteger(
            next.damagedQuantity,
          );
          const currentTotal = restock + hold + damaged;

          if (currentTotal < newReceived) {
            hold += newReceived - currentTotal;
          } else if (currentTotal > newReceived) {
            let overflow = currentTotal - newReceived;

            const holdReduction = Math.min(hold, overflow);
            hold -= holdReduction;
            overflow -= holdReduction;

            const damagedReduction = Math.min(
              damaged,
              overflow,
            );
            damaged -= damagedReduction;
            overflow -= damagedReduction;

            restock = Math.max(0, restock - overflow);
          }

          next.restockQuantity = restock;
          next.holdQuantity = hold;
          next.damagedQuantity = damaged;
        }

        return next;
      }),
    );
  };

  const getMatchedItem = (inspectionItem) => {
    return (refund?.items || []).find(
      (item) => item.id === inspectionItem.refundRequestItemId,
    );
  };

  const completeInspection = () => {
    if (!refund?.id) return;

    if (!inspectionSummary.trim()) {
      toastr.warning("Enter an overall inspection summary.");
      return;
    }

    if (!inspectionItems.length) {
      toastr.warning("No matched return items are available for inspection.");
      return;
    }

    for (const inspected of inspectionItems) {
      const item = getMatchedItem(inspected);
      const approvedQuantity = Math.max(1, Number(item?.quantity || 1));
      const receivedQuantity = Number(inspected.quantityReceived || 0);

      if (receivedQuantity < 0 || receivedQuantity > approvedQuantity) {
        toastr.warning(
          `Quantity received for ${
            item?.partName || item?.productTitle || "an item"
          } must be between 0 and ${approvedQuantity}.`,
        );
        return;
      }

      const restockQuantity = toNonNegativeInteger(
        inspected.restockQuantity,
      );
      const holdQuantity = toNonNegativeInteger(
        inspected.holdQuantity,
      );
      const damagedQuantity = toNonNegativeInteger(
        inspected.damagedQuantity,
      );
      const allocatedQuantity =
        restockQuantity + holdQuantity + damagedQuantity;

      if (allocatedQuantity !== receivedQuantity) {
        toastr.warning(
          `Allocate all received units for ${
            item?.partName || item?.productTitle || "the item"
          }. Restock + Hold + Damaged must equal ${receivedQuantity}.`,
        );
        return;
      }

      if (restockQuantity > 0 && !item?.partId) {
        toastr.warning(
          "A Shopify-only item must be matched to a Site_2024 part before automatic restocking can be proposed.",
        );
        return;
      }

      const hasIssue =
        !inspected.isSameItem ||
        !inspected.isComplete ||
        inspected.isAltered ||
        inspected.hasNewDamage ||
        receivedQuantity < approvedQuantity ||
        holdQuantity > 0 ||
        damagedQuantity > 0;

      if (hasIssue && !inspected.inspectionNotes.trim()) {
        toastr.warning(
          `Add inspection notes for ${
            item?.partName || item?.productTitle || "the item"
          } because an issue, held quantity, damaged quantity, or missing quantity was recorded.`,
        );
        return;
      }
    }

    setCompleting(true);

    refundRequestsService
      .completeReturnInspection(refund.id, {
        inspectionSummary: inspectionSummary.trim(),
        items: inspectionItems.map((item) => ({
          ...item,
          quantityReceived: toNonNegativeInteger(
            item.quantityReceived,
          ),
          restockQuantity: toNonNegativeInteger(
            item.restockQuantity,
          ),
          holdQuantity: toNonNegativeInteger(
            item.holdQuantity,
          ),
          damagedQuantity: toNonNegativeInteger(
            item.damagedQuantity,
          ),
          inspectionNotes: item.inspectionNotes.trim() || null,
        })),
      })
      .then((response) => {
        toastr.success("Inspection completed. Return is ready for final refund review.");
        onUpdated?.(response?.item || refund);
      })
      .catch((error) => {
        showApiError(error, "Unable to complete the inspection.");
      })
      .finally(() => setCompleting(false));
  };

  return (
    <div className="refunds-section refunds-inspection-panel">
      <div className="refunds-section-heading">
        <div>
          <h4>Item Received & Inspection</h4>
          <p>
            Carrier delivery is not the same as warehouse receipt. Confirm the
            package was physically received, inspect every approved item, and
            allocate every received unit to Restock, Hold, or Damaged.
          </p>
        </div>

        <div
          className={`refunds-inspection-status ${String(
            refund?.inspectionStatus || "NotStarted",
          )
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          {completed
            ? "Ready for Final Refund"
            : received
              ? "Inspection Pending"
              : "Awaiting Receipt"}
        </div>
      </div>

      {!received ? (
        <div className="refunds-inspection-form-card">
          <h5>Mark Item Received</h5>

          <div className="refunds-inspection-grid two-column">
            <label>
              Received Date / Time
              <input
                type="datetime-local"
                name="receivedAt"
                value={receiveForm.receivedAt}
                onChange={onReceiveChange}
              />
            </label>

            <label className="full-width">
              Receiving Notes
              <textarea
                name="notes"
                rows="3"
                value={receiveForm.notes}
                onChange={onReceiveChange}
                placeholder="Package condition, hand-delivery details, missing parcels, or other receiving notes."
              />
            </label>
          </div>

          <div className="refunds-inspection-actions">
            <button
              type="button"
              className="refunds-btn primary"
              onClick={markReceived}
              disabled={receiving}
            >
              {receiving ? "Saving Receipt..." : "Mark Item Received"}
            </button>
          </div>
        </div>
      ) : (
        <div className="refunds-inspection-received-summary">
          <div>
            <strong>Physically received</strong>
            <span>{formatDate(refund?.itemReceivedAt)}</span>
          </div>
          <div>
            <strong>Received by</strong>
            <span>{refund?.itemReceivedByName || "-"}</span>
          </div>
          <div className="full-width">
            <strong>Receiving notes</strong>
            <span>{refund?.itemReceivedNotes || "None"}</span>
          </div>
        </div>
      )}

      {received && !completed && (
        <div className="refunds-inspection-form-card">
          <h5>Complete Inspection</h5>

          <label className="refunds-inspection-summary-field">
            Overall Inspection Summary
            <textarea
              rows="4"
              value={inspectionSummary}
              onChange={(event) =>
                setInspectionSummary(event.target.value)
              }
              placeholder="Summarize the package condition, item identity, completeness, and anything that should affect the final refund."
            />
          </label>

          <div className="refunds-inspection-items">
            {inspectionItems.map((inspected) => {
              const item = getMatchedItem(inspected);
              const title =
                item?.partName ||
                item?.productTitle ||
                `Return Item #${inspected.refundRequestItemId}`;
              const approvedQuantity = Math.max(
                1,
                Number(item?.quantity || 1),
              );
              const restockQuantity = toNonNegativeInteger(
                inspected.restockQuantity,
              );
              const holdQuantity = toNonNegativeInteger(
                inspected.holdQuantity,
              );
              const damagedQuantity = toNonNegativeInteger(
                inspected.damagedQuantity,
              );
              const allocatedQuantity =
                restockQuantity + holdQuantity + damagedQuantity;
              const receivedQuantity = toNonNegativeInteger(
                inspected.quantityReceived,
              );
              const allocationBalanced =
                allocatedQuantity === receivedQuantity;

              return (
                <article
                  key={inspected.refundRequestItemId}
                  className="refunds-inspection-item-card"
                >
                  <div className="refunds-inspection-item-heading">
                    <div>
                      <strong>{title}</strong>
                      <span>
                        Approved return quantity: {approvedQuantity}
                        {item?.sku || item?.partNumber
                          ? ` | SKU/Part #: ${item?.sku || item?.partNumber}`
                          : ""}
                      </span>
                    </div>

                    <label className="refunds-inspection-quantity">
                      Quantity Received
                      <input
                        type="number"
                        min="0"
                        max={approvedQuantity}
                        value={inspected.quantityReceived}
                        onChange={(event) =>
                          changeInspectionItem(
                            inspected.refundRequestItemId,
                            "quantityReceived",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="refunds-inspection-checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={inspected.isSameItem}
                        onChange={(event) =>
                          changeInspectionItem(
                            inspected.refundRequestItemId,
                            "isSameItem",
                            event.target.checked,
                          )
                        }
                      />
                      Same item originally shipped
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={inspected.isComplete}
                        onChange={(event) =>
                          changeInspectionItem(
                            inspected.refundRequestItemId,
                            "isComplete",
                            event.target.checked,
                          )
                        }
                      />
                      All supplied components included
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={inspected.isAltered}
                        onChange={(event) =>
                          changeInspectionItem(
                            inspected.refundRequestItemId,
                            "isAltered",
                            event.target.checked,
                          )
                        }
                      />
                      Altered or modified
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={inspected.hasNewDamage}
                        onChange={(event) =>
                          changeInspectionItem(
                            inspected.refundRequestItemId,
                            "hasNewDamage",
                            event.target.checked,
                          )
                        }
                      />
                      New damage found
                    </label>
                  </div>

                  <label>
                    Item Inspection Notes
                    <textarea
                      rows="3"
                      value={inspected.inspectionNotes}
                      onChange={(event) =>
                        changeInspectionItem(
                          inspected.refundRequestItemId,
                          "inspectionNotes",
                          event.target.value,
                        )
                      }
                      placeholder="Required when any issue, discrepancy, missing quantity, alteration, or new damage is recorded."
                    />
                  </label>

                  <div className="refunds-inspection-allocation">
                    <div className="refunds-inspection-allocation-heading">
                      <div>
                        <strong>Inventory Quantity Allocation</strong>
                        <span>
                          Restock + Hold + Damaged must equal Quantity
                          Received.
                        </span>
                      </div>

                      <div
                        className={`refunds-inspection-allocation-status ${
                          allocationBalanced
                            ? "is-balanced"
                            : "is-unbalanced"
                        }`}
                      >
                        Allocated {allocatedQuantity} of {receivedQuantity}
                      </div>
                    </div>

                    <div className="refunds-inspection-bucket-grid">
                      <label>
                        Restock Now
                        <input
                          type="number"
                          min="0"
                          max={receivedQuantity}
                          value={inspected.restockQuantity}
                          disabled={!item?.partId}
                          onChange={(event) =>
                            changeInspectionItem(
                              inspected.refundRequestItemId,
                              "restockQuantity",
                              event.target.value,
                            )
                          }
                        />
                        <small>
                          Added to Site_2024 and Shopify only during final
                          refund confirmation.
                        </small>
                      </label>

                      <label>
                        Hold Unavailable
                        <input
                          type="number"
                          min="0"
                          max={receivedQuantity}
                          value={inspected.holdQuantity}
                          onChange={(event) =>
                            changeInspectionItem(
                              inspected.refundRequestItemId,
                              "holdQuantity",
                              event.target.value,
                            )
                          }
                        />
                        <small>
                          Kept out of saleable inventory for repair, research,
                          or later review.
                        </small>
                      </label>

                      <label>
                        Damaged / Do Not Restock
                        <input
                          type="number"
                          min="0"
                          max={receivedQuantity}
                          value={inspected.damagedQuantity}
                          onChange={(event) =>
                            changeInspectionItem(
                              inspected.refundRequestItemId,
                              "damagedQuantity",
                              event.target.value,
                            )
                          }
                        />
                        <small>
                          Recorded as damaged and excluded from saleable
                          inventory.
                        </small>
                      </label>
                    </div>

                    {!item?.partId && (
                      <div className="refunds-inspection-allocation-warning">
                        This Shopify order line is not matched to a local
                        Site_2024 part, so automatic restocking is disabled.
                      </div>
                    )}

                    {!allocationBalanced && (
                      <div className="refunds-inspection-allocation-warning">
                        Adjust the three quantities so they total{" "}
                        {receivedQuantity}.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {refund?.returnShippingPayer === "Buyer" &&
            Number(refund?.returnLabelCost || 0) > 0 && (
              <div className="refunds-inspection-deduction-note">
                Buyer-paid Pirate Ship label cost documented for Step 34: <strong>
                  {Number(refund.returnLabelCost).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </strong>
              </div>
            )}

          <div className="refunds-inspection-actions">
            <button
              type="button"
              className="refunds-btn primary"
              onClick={completeInspection}
              disabled={completing}
            >
              {completing
                ? "Completing Inspection..."
                : "Complete Inspection"}
            </button>
          </div>
        </div>
      )}

      {completed && (
        <div className="refunds-inspection-complete">
          <div className="refunds-inspection-complete-summary">
            <div>
              <strong>Inspection completed</strong>
              <span>{formatDate(refund?.inspectionCompletedAt)}</span>
            </div>
            <div>
              <strong>Inspected by</strong>
              <span>{refund?.inspectedByName || "-"}</span>
            </div>
            <div>
              <strong>Ready for final refund</strong>
              <span>{formatDate(refund?.readyForRefundAt)}</span>
            </div>
            <div className="full-width">
              <strong>Inspection summary</strong>
              <span>{refund?.inspectionSummary || "-"}</span>
            </div>
          </div>

          <div className="refunds-inspection-readonly-items">
            {(refund?.items || []).map((item) => (
              <article key={item.id}>
                <strong>
                  {item.partName || item.productTitle || `Item #${item.id}`}
                </strong>
                <span>
                  Received: {item.quantityReceived ?? 0} of {item.quantity || 1}
                </span>
                <span>
                  Same item: {item.isSameItem ? "Yes" : "No"} | Complete: {item.isComplete ? "Yes" : "No"}
                </span>
                <span>
                  Altered: {item.isAltered ? "Yes" : "No"} | New damage: {item.hasNewDamage ? "Yes" : "No"}
                </span>
                <span>
                  Inventory allocation — Restock:{" "}
                  {item.restockQuantity ?? item.proposedRestockQuantity ?? 0}
                  {" | "}Hold: {item.holdQuantity ?? 0}
                  {" | "}Damaged: {item.damagedQuantity ?? 0}
                </span>
                <p>{item.inspectionNotes || "No item-specific notes."}</p>
              </article>
            ))}
          </div>

          <div className="refunds-inspection-next-step">
            Inspection is locked and ready for Step 34. No inventory quantity or
            Shopify inventory has been changed yet. Final refund confirmation
            will add only the Restock quantity once. Hold and Damaged units
            remain outside saleable inventory until a later explicit action.
          </div>
        </div>
      )}

      {refund?.inspectionEvents?.length > 0 && (
        <div className="refunds-inspection-history">
          <h5>Inspection Event History</h5>
          {refund.inspectionEvents.map((event) => (
            <div key={event.id}>
              <strong>{event.eventType}</strong>
              <span>{event.createdByName || "System"}</span>
              <span>{formatDate(event.dateCreated)}</span>
              {event.quantityReceived !== null &&
                event.quantityReceived !== undefined && (
                  <span>Qty received: {event.quantityReceived}</span>
                )}
              {(event.restockQuantity !== null &&
                event.restockQuantity !== undefined) ||
              (event.holdQuantity !== null &&
                event.holdQuantity !== undefined) ||
              (event.damagedQuantity !== null &&
                event.damagedQuantity !== undefined) ? (
                <span>
                  Restock: {event.restockQuantity ?? 0} | Hold:{" "}
                  {event.holdQuantity ?? 0} | Damaged:{" "}
                  {event.damagedQuantity ?? 0}
                </span>
              ) : (
                event.inventoryDisposition && (
                  <span>
                    Disposition: {event.inventoryDisposition}
                  </span>
                )
              )}
              {event.notes && <p>{event.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminRefundInspectionPanel;
