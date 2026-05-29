import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";
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

const initialStatusForm = {
  status: "",
  notes: "",
  adminNotes: "",
  denialReason: "",
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
  const [saving, setSaving] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [statusForm, setStatusForm] = useState(initialStatusForm);

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

  const getSelectedCreateReason = () => {
    return returnReasons.find(
      (reason) => Number(reason.id) === Number(createForm.returnReasonId),
    );
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

  const hydrateStatusForm = (item) => {
    setStatusForm({
      status: item?.status || item?.statusName || "",
      notes: item?.notes || "",
      adminNotes: item?.adminNotes || "",
      denialReason: item?.denialReason || "",
    });
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
          setStatusForm(initialStatusForm);
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

    refundRequestsService
      .getRefundRequestById(id)
      .then((response) => {
        const item = response?.item || null;
        setSelectedRefund(item);
        hydrateStatusForm(item);
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
    setStatusForm(initialStatusForm);
    loadRefunds(0);
  };

  const onReset = () => {
    setFilters(initialFilters);
    setSelectedRefund(null);
    setStatusForm(initialStatusForm);
    setTimeout(() => loadRefunds(0), 0);
  };

  const onSelectRefund = (refund) => {
    if (!refund?.id) return;
    loadRefundById(refund.id);
  };

  const onStatusFormChange = (e) => {
    const { name, value } = e.target;
    setStatusForm((prev) => ({ ...prev, [name]: value }));
  };

  const onUpdateStatus = () => {
    if (!selectedRefund?.id) {
      toastr.warning("Select a refund request first.");
      return;
    }

    if (!statusForm.status) {
      toastr.warning("Please choose a status.");
      return;
    }

    if (statusForm.status === "Denied" && !statusForm.denialReason.trim()) {
      toastr.warning("Please add a denial reason when denying a refund request.");
      return;
    }

    setSaving(true);

    const payload = {
      status: statusForm.status,
      notes: statusForm.notes.trim() || null,
      adminNotes: statusForm.adminNotes.trim() || null,
      denialReason: statusForm.denialReason.trim() || null,
    };

    refundRequestsService
      .updateRefundRequestStatus(selectedRefund.id, payload)
      .then(() => {
        toastr.success("Refund request updated.");
        loadRefundById(selectedRefund.id);
        loadRefunds(pageData.pageIndex);
      })
      .catch((err) => {
        showApiError(err, "Failed to update refund request.");
      })
      .finally(() => {
        setSaving(false);
      });
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

    const selectedReason = getSelectedCreateReason();

    if (!createForm.partId) {
      toastr.warning("Part Id is required.");
      return;
    }

    if (!createForm.reason.trim()) {
      toastr.warning("Reason is required.");
      return;
    }

    if (selectedReason?.requiresNotes && !createForm.notes.trim()) {
      toastr.warning("This reason requires written notes.");
      return;
    }

    if (selectedReason?.requiresPhotos) {
      toastr.warning("This reason requires photos. Photo upload will be handled from the customer return form.");
      return;
    }

    setCreating(true);

    const partId = Number(createForm.partId);
    const payload = {
      partId,
      shopifyOrderId: createForm.shopifyOrderId ? Number(createForm.shopifyOrderId) : null,
      orderNumber: createForm.orderNumber.trim() || null,
      customerEmail: createForm.customerEmail.trim() || null,
      returnReasonId: createForm.returnReasonId ? Number(createForm.returnReasonId) : null,
      reason: createForm.reason.trim(),
      notes: createForm.notes.trim() || null,
      items: [{ partId, quantity: 1 }],
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

              <div className="refunds-section">
                <h4>Requested Items</h4>
                {selectedRefund.items?.length ? (
                  <div className="refund-items-list">
                    {selectedRefund.items.map((item) => (
                      <div key={item.id} className="refund-item-card">
                        {item.image && <img src={getImageUrl(item.image)} alt={item.partName || "Part"} />}
                        <div>
                          <strong>{item.partName || `Part ${item.partId}`}</strong>
                          <p>Part #: {item.partNumber || "-"}</p>
                          <p>Qty: {item.quantity || 1}</p>
                          <p>Price: {formatCurrency(item.price)}</p>
                          {item.itemNotes && <p>Item Notes: {item.itemNotes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="refunds-empty compact">No item rows were returned for this request.</div>
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

              <div className="refunds-update-panel">
                <h4>Admin Decision</h4>

                <div className="refunds-filter-group">
                  <label htmlFor="updateStatus">Update Status</label>
                  <select id="updateStatus" name="status" value={statusForm.status} onChange={onStatusFormChange}>
                    <option value="">Select status</option>
                    {activeStatusOptions.map((option) => (
                      <option key={option.id || option.name} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="refunds-filter-group full-width">
                  <label htmlFor="updateNotes">Customer/Internal Case Notes</label>
                  <textarea id="updateNotes" name="notes" value={statusForm.notes} onChange={onStatusFormChange} rows="4" placeholder="General notes for this refund request..." />
                </div>

                <div className="refunds-filter-group full-width">
                  <label htmlFor="adminNotes">Admin Notes</label>
                  <textarea id="adminNotes" name="adminNotes" value={statusForm.adminNotes} onChange={onStatusFormChange} rows="4" placeholder="Admin-only notes..." />
                </div>

                <div className="refunds-filter-group full-width">
                  <label htmlFor="denialReason">Denial Reason</label>
                  <textarea id="denialReason" name="denialReason" value={statusForm.denialReason} onChange={onStatusFormChange} rows="3" placeholder="Required if denying this request..." />
                </div>

                <div className="refunds-filter-actions">
                  <button type="button" className="refunds-btn primary" onClick={onUpdateStatus} disabled={saving}>
                    {saving ? "Saving..." : "Save Update"}
                  </button>
                </div>
              </div>
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
                <label htmlFor="createPartId">Part Id</label>
                <input id="createPartId" name="partId" type="number" value={createForm.partId} onChange={onCreateFormChange} placeholder="e.g. 125" />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createShopifyOrderId">Shopify Order Id</label>
                <input id="createShopifyOrderId" name="shopifyOrderId" type="number" value={createForm.shopifyOrderId} onChange={onCreateFormChange} placeholder="e.g. 1234567890" />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createOrderNumber">Order Number</label>
                <input id="createOrderNumber" name="orderNumber" type="text" value={createForm.orderNumber} onChange={onCreateFormChange} placeholder="e.g. #1001" />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createCustomerEmail">Customer Email</label>
                <input id="createCustomerEmail" name="customerEmail" type="email" value={createForm.customerEmail} onChange={onCreateFormChange} placeholder="customer@email.com" />
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
