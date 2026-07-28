import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";
import AdminRefundDecisionPanel from "./AdminRefundDecisionPanel";
import AdminRefundShippingPanel from "./AdminRefundShippingPanel";
import AdminRefundInspectionPanel from "./AdminRefundInspectionPanel";
import { API_HOST_PREFIX } from "../service/serviceHelpers";
import "./AdminRefunds.css";

const FALLBACK_STATUS_OPTIONS = [
  { id: 1, name: "Requested" },
  { id: 2, name: "Approved" },
  { id: 3, name: "Denied" },
  { id: 4, name: "Refunded" },
  { id: 5, name: "Closed" },
];

const initialCreateForm = {
  partId: "",
  shopifyOrderId: "",
  orderNumber: "",
  customerEmail: "",
  requestedPartName: "",
  requestedQuantity: "1",
  returnReasonId: "",
  reason: "",
  notes: "",
};

const initialFilters = {
  status: "",
  partId: "",
  shopifyOrderId: "",
  orderNumber: "",
  customerEmail: "",
};

function AdminRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [returnReasons, setReturnReasons] = useState([]);
  const [returnStatuses, setReturnStatuses] = useState(FALLBACK_STATUS_OPTIONS);

  const [filters, setFilters] = useState(initialFilters);

  const [pageData, setPageData] = useState({
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);

  const [shopifyLookup, setShopifyLookup] = useState(null);
  const [orderLookupLoading, setOrderLookupLoading] = useState(false);
  const [matchingItems, setMatchingItems] = useState(false);
  const [selectedOrderItems, setSelectedOrderItems] = useState({});

  const activeStatusOptions = useMemo(() => {
    return returnStatuses?.length ? returnStatuses : FALLBACK_STATUS_OPTIONS;
  }, [returnStatuses]);

  const showApiError = (err, fallback = "Something went wrong.") => {
    const msg =
      err?.response?.data?.errors?.[0] ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      fallback;

    toastr.error(msg);
  };

  const mapPagedResponse = (response) => {
    const paged = response?.item;
    const items = paged?.pagedItems || paged?.items || [];
    const pageIndex = paged?.pageIndex ?? 0;
    const pageSize = paged?.pageSize ?? 10;
    const totalCount = paged?.totalCount ?? 0;
    const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { items, pageIndex, pageSize, totalCount, totalPages };
  };

  const getReasonName = (reasonId) => {
    const match = returnReasons.find((reason) => Number(reason.id) === Number(reasonId));
    return match?.name || "";
  };

  const getImageUrl = (url) => {
    if (!url) return "";

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    const cleanBase = String(API_HOST_PREFIX || "").replace(/\/$/, "");
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanUrl}`;
  };

  const formatCurrency = (value) => {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return value || "-";

    return numberValue.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  };

  const formatDate = (value) => {
    return value ? new Date(value).toLocaleString() : "-";
  };

  const buildFilters = () => {
    const payload = {};

    if (filters.status) payload.status = filters.status;
    if (filters.partId !== "") payload.partId = Number(filters.partId);
    if (filters.shopifyOrderId !== "") payload.shopifyOrderId = Number(filters.shopifyOrderId);
    if (filters.orderNumber.trim()) payload.orderNumber = filters.orderNumber.trim();
    if (filters.customerEmail.trim()) payload.customerEmail = filters.customerEmail.trim();

    return payload;
  };



  const loadRefunds = (pageIndex = pageData.pageIndex) => {
    setLoading(true);

    refundRequestsService
      .getRefundRequestsPaginated(pageIndex, pageData.pageSize, buildFilters())
      .then((response) => {
        const mapped = mapPagedResponse(response);

        setRefunds(mapped.items);
        setPageData((prev) => ({
          ...prev,
          pageIndex: mapped.pageIndex,
          pageSize: mapped.pageSize,
          totalCount: mapped.totalCount,
          totalPages: mapped.totalPages,
        }));

        if (selectedRefund && !mapped.items.some((item) => item.id === selectedRefund.id)) {
          setSelectedRefund(null);
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setRefunds([]);
          setPageData((prev) => ({ ...prev, pageIndex: 0, totalCount: 0, totalPages: 0 }));
          return;
        }

        showApiError(err, "Failed to load refund requests.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadRefundById = (id) => {
    setDetailsLoading(true);
    setShopifyLookup(null);
    setSelectedOrderItems({});

    refundRequestsService
      .getRefundRequestById(id)
      .then((response) => {
        const item = response?.item || null;
        setSelectedRefund(item);
      })
      .catch((err) => {
        showApiError(err, "Failed to load refund details.");
      })
      .finally(() => {
        setDetailsLoading(false);
      });
  };

  const loadLookups = () => {
    setLookupsLoading(true);

    Promise.allSettled([
      refundRequestsService.getReturnReasons(),
      refundRequestsService.getReturnStatuses(),
    ])
      .then(([reasonsResult, statusesResult]) => {
        if (reasonsResult.status === "fulfilled") {
          setReturnReasons(reasonsResult.value?.item || []);
        }

        if (statusesResult.status === "fulfilled") {
          setReturnStatuses(statusesResult.value?.item || FALLBACK_STATUS_OPTIONS);
        }
      })
      .finally(() => setLookupsLoading(false));
  };

  useEffect(() => {
    loadLookups();
    loadRefunds(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = (e) => {
    e.preventDefault();
    setSelectedRefund(null);
    setShopifyLookup(null);
    setSelectedOrderItems({});
    loadRefunds(0);
  };

  const onReset = () => {
    setFilters(initialFilters);
    setSelectedRefund(null);
    setShopifyLookup(null);
    setSelectedOrderItems({});
    setTimeout(() => loadRefunds(0), 0);
  };

  const onSelectRefund = (refund) => {
    if (!refund?.id) return;
    loadRefundById(refund.id);
  };

  const goToPreviousPage = () => {
    if (pageData.pageIndex > 0) loadRefunds(pageData.pageIndex - 1);
  };

  const goToNextPage = () => {
    if (pageData.pageIndex + 1 < pageData.totalPages) loadRefunds(pageData.pageIndex + 1);
  };

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setShowCreateModal(false);
    setCreateForm(initialCreateForm);
  };

  const onCreateFormChange = (e) => {
    const { name, value } = e.target;

    setCreateForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "returnReasonId") {
        const reasonName = getReasonName(value);
        next.reason = reasonName;
      }

      return next;
    });
  };

  const onCreateRefundRequest = (e) => {
    e.preventDefault();

    if (!createForm.reason.trim()) {
      toastr.warning("Reason is required.");
      return;
    }

    setCreating(true);

    const partId = createForm.partId.trim()
      ? Number(createForm.partId.trim())
      : null;

    const payload = {
      partId,
      shopifyOrderId: createForm.shopifyOrderId.trim() || null,
      orderNumber: createForm.orderNumber.trim() || null,
      customerEmail: createForm.customerEmail.trim() || null,
      requestedPartName: createForm.requestedPartName.trim() || null,
      requestedQuantity: createForm.requestedQuantity.trim()
        ? Number(createForm.requestedQuantity.trim())
        : null,
      returnReasonId: createForm.returnReasonId
        ? Number(createForm.returnReasonId)
        : null,
      reason: createForm.reason.trim(),
      notes: createForm.notes.trim() || null,
      items: partId ? [{ partId, quantity: 1 }] : [],
      photos: [],
    };

    refundRequestsService
      .addRefundRequest(payload)
      .then((response) => {
        const newId = response?.item;
        toastr.success("Refund request created.");
        closeCreateModal();
        loadRefunds(0);

        if (newId) loadRefundById(newId);
      })
      .catch((err) => {
        showApiError(err, "Failed to create refund request.");
      })
      .finally(() => {
        setCreating(false);
      });
  };

  const getOrderItemImage = (item) => {
    return (
      item?.localPart?.imageUrl ||
      item?.localPart?.imageUrls?.[0] ||
      item?.shopifyImageUrl ||
      ""
    );
  };

  const buildSelectedOrderItemState = (order) => {
    const existing = new Map(
      (selectedRefund?.items || [])
        .filter((item) => item.shopifyLineItemId)
        .map((item) => [
          String(item.shopifyLineItemId),
          Number(item.quantity || 1),
        ]),
    );

    const next = {};

    (order?.lineItems || []).forEach((item) => {
      const id = String(item.shopifyLineItemId);
      const existingQuantity = existing.get(id);

      if (existingQuantity) {
        next[id] = Math.min(
          Math.max(1, existingQuantity),
          Number(item.quantity || 1),
        );
      }
    });

    return next;
  };

  const loadShopifyOrder = () => {
    if (!selectedRefund?.id) {
      toastr.warning("Select a refund request first.");
      return;
    }

    if (!selectedRefund.orderNumber) {
      toastr.warning("This request does not have an order number.");
      return;
    }

    setOrderLookupLoading(true);

    refundRequestsService
      .getShopifyOrderForRefund(selectedRefund.id)
      .then((response) => {
        const lookup = response?.item || null;
        setShopifyLookup(lookup);
        setSelectedOrderItems(
          buildSelectedOrderItemState(lookup?.order),
        );

        if (lookup?.customerEmailMatches) {
          toastr.success("Shopify order loaded and email matched.");
        } else {
          toastr.warning(
            "Shopify order loaded, but the customer email does not match. Verify it before approval.",
          );
        }
      })
      .catch((err) => {
        setShopifyLookup(null);
        setSelectedOrderItems({});
        showApiError(err, "Unable to load the Shopify order.");
      })
      .finally(() => {
        setOrderLookupLoading(false);
      });
  };

  const toggleOrderItem = (item) => {
    const id = String(item.shopifyLineItemId);

    setSelectedOrderItems((current) => {
      const next = { ...current };

      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }

      return next;
    });
  };

  const changeOrderItemQuantity = (item, value) => {
    const id = String(item.shopifyLineItemId);
    const max = Math.max(1, Number(item.quantity || 1));
    const parsed = Number(value);
    const quantity = Number.isFinite(parsed)
      ? Math.min(max, Math.max(1, parsed))
      : 1;

    setSelectedOrderItems((current) => ({
      ...current,
      [id]: quantity,
    }));
  };

  const saveMatchedOrderItems = () => {
    if (!selectedRefund?.id || !shopifyLookup?.order) {
      toastr.warning("Load the Shopify order first.");
      return;
    }

    const items = Object.entries(selectedOrderItems).map(
      ([shopifyLineItemId, quantity]) => ({
        shopifyLineItemId,
        quantity: Number(quantity),
      }),
    );

    if (items.length === 0) {
      toastr.warning("Select at least one order item.");
      return;
    }

    setMatchingItems(true);

    refundRequestsService
      .matchShopifyItems(selectedRefund.id, items)
      .then((response) => {
        const refreshed = response?.item || null;

        setSelectedRefund(refreshed);
        toastr.success("Shopify order items matched to the return request.");
        loadRefunds(pageData.pageIndex);
      })
      .catch((err) => {
        showApiError(err, "Unable to save the selected order items.");
      })
      .finally(() => {
        setMatchingItems(false);
      });
  };

  const orderCurrency = shopifyLookup?.order?.currencyCode || "USD";

  return (
    <div className="refunds-page">
      <div className="refunds-header">
        <div>
          <h2>Admin Refund Requests</h2>
          <p>Review customer return details, proof photos, and admin workflow updates.</p>
        </div>

        <button type="button" className="refunds-btn primary" onClick={openCreateModal}>
          Create Refund Request
        </button>
      </div>

      <form className="refunds-filters" onSubmit={onSearch}>
        <div className="refunds-filter-group">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" value={filters.status} onChange={onFilterChange}>
            <option value="">All</option>
            {activeStatusOptions.map((option) => (
              <option key={option.id || option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="refunds-filter-group">
          <label htmlFor="partId">Part Id</label>
          <input id="partId" name="partId" type="number" value={filters.partId} onChange={onFilterChange} placeholder="e.g. 125" />
        </div>

        <div className="refunds-filter-group">
          <label htmlFor="shopifyOrderId">Shopify Order Id</label>
          <input id="shopifyOrderId" name="shopifyOrderId" type="number" value={filters.shopifyOrderId} onChange={onFilterChange} placeholder="e.g. 1234567890" />
        </div>

        <div className="refunds-filter-group">
          <label htmlFor="orderNumber">Order Number</label>
          <input id="orderNumber" name="orderNumber" type="text" value={filters.orderNumber} onChange={onFilterChange} placeholder="e.g. #1001" />
        </div>

        <div className="refunds-filter-group">
          <label htmlFor="customerEmail">Customer Email</label>
          <input id="customerEmail" name="customerEmail" type="email" value={filters.customerEmail} onChange={onFilterChange} placeholder="customer@email.com" />
        </div>

        <div className="refunds-filter-actions">
          <button type="submit" className="refunds-btn primary">Search</button>
          <button type="button" className="refunds-btn secondary" onClick={onReset}>Reset</button>
        </div>
      </form>

      <div className="refunds-layout">
        <div className="refunds-table-card">
          <div className="refunds-table-header">
            <h3>Requests</h3>
            <span>{pageData.totalCount} total</span>
          </div>

          {loading ? (
            <div className="refunds-empty">Loading refund requests...</div>
          ) : refunds.length === 0 ? (
            <div className="refunds-empty">No refund requests found.</div>
          ) : (
            <table className="refunds-table">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Requested Part</th>
                  <th>Reason</th>
                  <th>Items</th>
                  <th>Photos</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id} className={selectedRefund?.id === refund.id ? "selected-row" : ""}>
                    <td>{refund.id}</td>
                    <td>
                      <div>{refund.orderNumber || "-"}</div>
                      <small>{refund.shopifyOrderId ? `Shopify: ${refund.shopifyOrderId}` : ""}</small>
                    </td>
                    <td>{refund.customerEmail || "-"}</td>
                    <td className="requested-part-cell">
                      <div>{refund.requestedPartName || refund.partName || "-"}</div>
                      {refund.requestedQuantity ? (
                        <small>Qty: {refund.requestedQuantity}</small>
                      ) : null}
                    </td>
                    <td className="reason-cell">{refund.returnReasonName || refund.reason}</td>
                    <td>{refund.itemCount ?? refund.items?.length ?? "-"}</td>
                    <td>{refund.photoCount ?? refund.photos?.length ?? "-"}</td>
                    <td>
                      <span className={`refund-status status-${String(refund.status || refund.statusName || "").toLowerCase()}`}>
                        {refund.status || refund.statusName}
                      </span>
                    </td>
                    <td>{formatDate(refund.dateCreated)}</td>
                    <td>
                      <button type="button" className="refunds-btn small" onClick={() => onSelectRefund(refund)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="refunds-pagination">
            <button type="button" className="refunds-btn secondary" onClick={goToPreviousPage} disabled={pageData.pageIndex === 0 || loading}>
              Previous
            </button>
            <span>Page {pageData.totalPages === 0 ? 0 : pageData.pageIndex + 1} of {pageData.totalPages}</span>
            <button type="button" className="refunds-btn secondary" onClick={goToNextPage} disabled={loading || pageData.totalPages === 0 || pageData.pageIndex + 1 >= pageData.totalPages}>
              Next
            </button>
          </div>
        </div>

        <div className="refunds-detail-card">
          <div className="refunds-table-header">
            <h3>Request Detail</h3>
            {lookupsLoading && <span>Loading dropdowns...</span>}
          </div>

          {detailsLoading ? (
            <div className="refunds-empty">Loading details...</div>
          ) : !selectedRefund ? (
            <div className="refunds-empty">Select a refund request to review it.</div>
          ) : (
            <>
              <div className="refunds-detail-grid">
                <div><strong>Refund Id:</strong> {selectedRefund.id}</div>
                <div><strong>Status:</strong> {selectedRefund.status || selectedRefund.statusName}</div>
                <div><strong>Order Number:</strong> {selectedRefund.orderNumber || "-"}</div>
                <div><strong>Customer Email:</strong> {selectedRefund.customerEmail || "-"}</div>
                <div><strong>Customer Part Description:</strong> {selectedRefund.requestedPartName || selectedRefund.partName || "-"}</div>
                <div><strong>Quantity Requested:</strong> {selectedRefund.requestedQuantity || "-"}</div>
                <div><strong>Shopify Order Id:</strong> {selectedRefund.shopifyOrderId || "-"}</div>
                <div><strong>Return Reason:</strong> {selectedRefund.returnReasonName || selectedRefund.reason || "-"}</div>
                <div><strong>Created By:</strong> {selectedRefund.createdByName || "-"}</div>
                <div><strong>Created:</strong> {formatDate(selectedRefund.dateCreated)}</div>
                <div><strong>Resolved By:</strong> {selectedRefund.resolvedByName || "-"}</div>
                <div><strong>Resolved Date:</strong> {formatDate(selectedRefund.resolvedDate)}</div>
              </div>

              <div className="refunds-text-block">
                <strong>Customer Notes</strong>
                <p>{selectedRefund.notes || "-"}</p>
              </div>

              <div className="refunds-section refunds-order-match-panel">
                <div className="refunds-section-heading">
                  <div>
                    <h4>Shopify Order Matching</h4>
                    <p>
                      Order contents are visible only to authenticated
                      administrators. Select the item or items the customer is
                      returning.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="refunds-btn secondary"
                    onClick={loadShopifyOrder}
                    disabled={orderLookupLoading || !selectedRefund.orderNumber}
                  >
                    {orderLookupLoading
                      ? "Loading Order..."
                      : shopifyLookup
                        ? "Reload Shopify Order"
                        : "Load Shopify Order"}
                  </button>
                </div>

                {!selectedRefund.orderNumber ? (
                  <div className="refunds-empty compact">
                    This request does not include an order number.
                  </div>
                ) : !shopifyLookup ? (
                  <div className="refunds-order-match-placeholder">
                    <strong>Saved order:</strong>{" "}
                    {selectedRefund.orderNumber}
                    <br />
                    <strong>Customer entry:</strong>{" "}
                    {selectedRefund.requestedPartName || "-"}
                    {selectedRefund.requestedQuantity
                      ? ` — Qty ${selectedRefund.requestedQuantity}`
                      : ""}
                  </div>
                ) : (
                  <>
                    <div className="refunds-order-summary">
                      <div>
                        <strong>{shopifyLookup.order.name}</strong>
                        <span>
                          Shopify ID: {shopifyLookup.order.shopifyOrderId}
                        </span>
                      </div>
                      <div>
                        <span>
                          {shopifyLookup.order.customerDisplayName ||
                            "Shopify Customer"}
                        </span>
                        <span>{shopifyLookup.order.customerEmail || "-"}</span>
                      </div>
                      <div>
                        <span>
                          {shopifyLookup.order.lineItems?.reduce(
                            (sum, item) => sum + Number(item.quantity || 0),
                            0,
                          )}{" "}
                          item(s)
                        </span>
                        <strong>
                          {formatCurrency(shopifyLookup.order.totalPrice)}
                        </strong>
                      </div>
                    </div>

                    <div
                      className={`refunds-email-check ${
                        shopifyLookup.customerEmailMatches
                          ? "is-match"
                          : "is-warning"
                      }`}
                    >
                      {shopifyLookup.customerEmailMatches
                        ? "The email entered by the customer matches the Shopify order."
                        : `Email mismatch: customer entered ${
                            shopifyLookup.requestedEmail || "no email"
                          }, while Shopify shows ${
                            shopifyLookup.order.customerEmail || "no email"
                          }. Verify manually before approval.`}
                    </div>

                    <div className="refunds-order-items">
                      {(shopifyLookup.order.lineItems || []).map((item) => {
                        const id = String(item.shopifyLineItemId);
                        const isSelected = Boolean(selectedOrderItems[id]);
                        const imageUrl = getOrderItemImage(item);

                        return (
                          <article
                            key={id}
                            className={`refunds-order-item ${
                              isSelected ? "is-selected" : ""
                            }`}
                          >
                            <label className="refunds-order-item-select">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOrderItem(item)}
                              />
                              <span>Select</span>
                            </label>

                            {imageUrl ? (
                              <img
                                src={getImageUrl(imageUrl)}
                                alt={item.title || "Order item"}
                              />
                            ) : (
                              <div className="refunds-order-item-no-image">
                                No Image
                              </div>
                            )}

                            <div className="refunds-order-item-copy">
                              <strong>{item.title}</strong>
                              <span>SKU: {item.sku || "-"}</span>
                              <span>Purchased: {item.quantity}</span>
                              <span>
                                Unit price:{" "}
                                {Number(item.unitPrice || 0).toLocaleString(
                                  undefined,
                                  {
                                    style: "currency",
                                    currency: orderCurrency,
                                  },
                                )}
                              </span>
                              <span>
                                Local match:{" "}
                                {item.localPart
                                  ? `#${item.localPart.partId} ${item.localPart.partName}`
                                  : "No Site_2024 part matched"}
                              </span>
                            </div>

                            <label className="refunds-order-item-quantity">
                              Return Qty
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={selectedOrderItems[id] || 1}
                                onChange={(event) =>
                                  changeOrderItemQuantity(
                                    item,
                                    event.target.value,
                                  )
                                }
                                disabled={!isSelected}
                              />
                            </label>
                          </article>
                        );
                      })}
                    </div>

                    <div className="refunds-order-match-actions">
                      <span>
                        {Object.keys(selectedOrderItems).length}{" "}
                        line item(s) selected
                      </span>

                      <button
                        type="button"
                        className="refunds-btn primary"
                        onClick={saveMatchedOrderItems}
                        disabled={
                          matchingItems ||
                          Object.keys(selectedOrderItems).length === 0
                        }
                      >
                        {matchingItems
                          ? "Saving Items..."
                          : "Save Selected Items"}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="refunds-section">
                <h4>Matched Return Items</h4>
                {selectedRefund.items?.length ? (
                  <div className="refund-items-list">
                    {selectedRefund.items.map((item) => (
                      <div key={item.id} className="refund-item-card">
                        {(item.image || item.imageUrl) && (
                          <img
                            src={getImageUrl(item.image || item.imageUrl)}
                            alt={item.partName || item.productTitle || "Part"}
                          />
                        )}
                        <div>
                          <strong>
                            {item.partName ||
                              item.productTitle ||
                              (item.partId
                                ? `Part ${item.partId}`
                                : "Shopify Order Item")}
                          </strong>
                          <p>
                            Part / SKU: {item.partNumber || item.sku || "-"}
                          </p>
                          <p>
                            Return Qty: {item.quantity || 1}
                            {item.quantityPurchased
                              ? ` of ${item.quantityPurchased} purchased`
                              : ""}
                          </p>
                          <p>
                            Unit Price:{" "}
                            {formatCurrency(item.unitPrice ?? item.price)}
                          </p>
                          {item.shopifyLineItemId && (
                            <p>
                              Shopify Line Item: {item.shopifyLineItemId}
                            </p>
                          )}
                          {item.itemNotes && (
                            <p>Item Notes: {item.itemNotes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="refunds-empty compact">
                    No Shopify order line has been matched yet. Load the
                    order above and select the item or items being returned.
                  </div>
                )}
              </div>

              <div className="refunds-section">
                <h4>Proof Photos</h4>
                {selectedRefund.photos?.length ? (
                  <div className="refund-photos-grid">
                    {selectedRefund.photos.map((photo) => (
                      <a key={photo.id} href={getImageUrl(photo.url)} target="_blank" rel="noreferrer" className="refund-photo-card">
                        <img src={getImageUrl(photo.url)} alt={photo.originalFileName || "Refund proof"} />
                        <span>{photo.originalFileName || "Open photo"}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="refunds-empty compact">No proof photos were submitted.</div>
                )}
              </div>

              <AdminRefundDecisionPanel
                refund={selectedRefund}
                formatDate={formatDate}
                showApiError={showApiError}
                onDecisionSaved={(updated) => {
                  setSelectedRefund(updated);
                  setShopifyLookup(null);
                  setSelectedOrderItems({});
                  loadRefunds(pageData.pageIndex);
                }}
              />

              <AdminRefundShippingPanel
                refund={selectedRefund}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                showApiError={showApiError}
                onUpdated={(updated) => {
                  setSelectedRefund(updated);
                  loadRefunds(pageData.pageIndex);
                }}
              />

              <AdminRefundInspectionPanel
                refund={selectedRefund}
                formatDate={formatDate}
                showApiError={showApiError}
                onUpdated={(updated) => {
                  setSelectedRefund(updated);
                  loadRefunds(pageData.pageIndex);
                }}
              />
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="refunds-modal-overlay" onClick={closeCreateModal}>
          <div className="refunds-modal" onClick={(e) => e.stopPropagation()}>
            <div className="refunds-modal-header">
              <h3>Create Refund Request</h3>
              <button type="button" className="refunds-btn secondary" onClick={closeCreateModal} disabled={creating}>
                Close
              </button>
            </div>

            <form onSubmit={onCreateRefundRequest} className="refunds-modal-form">
              <div className="refunds-filter-group">
                <label htmlFor="createPartId">Part Id (optional)</label>
                <input id="createPartId" name="partId" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="10" value={createForm.partId} onChange={onCreateFormChange} placeholder="e.g. 125" />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createShopifyOrderId">Shopify Order Id (optional)</label>
                <input id="createShopifyOrderId" name="shopifyOrderId" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="19" value={createForm.shopifyOrderId} onChange={onCreateFormChange} placeholder="e.g. 1234567890" />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createOrderNumber">Order Number</label>
                <input id="createOrderNumber" name="orderNumber" type="text" value={createForm.orderNumber} onChange={onCreateFormChange} placeholder="e.g. #1001" />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createCustomerEmail">Customer Email</label>
                <input id="createCustomerEmail" name="customerEmail" type="email" value={createForm.customerEmail} onChange={onCreateFormChange} placeholder="customer@email.com" />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createRequestedPartName">Customer Part Description (optional)</label>
                <input id="createRequestedPartName" name="requestedPartName" type="text" maxLength="500" value={createForm.requestedPartName} onChange={onCreateFormChange} placeholder="Part name or description" />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createRequestedQuantity">Requested Quantity (optional)</label>
                <input id="createRequestedQuantity" name="requestedQuantity" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="3" value={createForm.requestedQuantity} onChange={onCreateFormChange} />
              </div>

              <div className="refunds-filter-group full-width">
                <label htmlFor="createReturnReasonId">Reason</label>
                <select id="createReturnReasonId" name="returnReasonId" value={createForm.returnReasonId} onChange={onCreateFormChange}>
                  <option value="">Select a reason</option>
                  {returnReasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>{reason.name}</option>
                  ))}
                </select>
              </div>

              {!returnReasons.length && (
                <div className="refunds-filter-group full-width">
                  <label htmlFor="createReason">Reason</label>
                  <input id="createReason" name="reason" type="text" value={createForm.reason} onChange={onCreateFormChange} placeholder="Reason for refund request" />
                </div>
              )}

              <div className="refunds-admin-override-note full-width">
                Admin-created requests can be saved without proof photos or
                customer-facing reason requirements. Add internal context in
                Notes when an exception is being made.
              </div>

              <div className="refunds-filter-group full-width">
                <label htmlFor="createNotes">Notes</label>
                <textarea id="createNotes" name="notes" rows="5" value={createForm.notes} onChange={onCreateFormChange} placeholder="Optional notes" />
              </div>

              <div className="refunds-filter-actions">
                <button type="submit" className="refunds-btn primary" disabled={creating}>
                  {creating ? "Creating..." : "Create Refund Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRefunds;
