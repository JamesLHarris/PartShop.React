import React, { useEffect, useState } from "react";
import toastr from "toastr";
import refundRequestsService from "../service/refundRequestService";
import "./AdminRefunds.css";

const STATUS_OPTIONS = [
  "Requested",
  "Approved",
  "Refunded",
  "Denied",
  "Closed",
];

const initialCreateForm = {
  partId: "",
  shopifyOrderId: "",
  reason: "",
  notes: "",
};

function AdminRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [selectedRefund, setSelectedRefund] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    partId: "",
    shopifyOrderId: "",
  });

  const [pageData, setPageData] = useState({
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);

  const [statusForm, setStatusForm] = useState({
    status: "",
    notes: "",
  });

  const showApiError = (err, fallback = "Something went wrong.") => {
    const msg =
      err?.response?.data?.errors?.[0] ||
      err?.response?.data?.error ||
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

    return {
      items,
      pageIndex,
      pageSize,
      totalCount,
      totalPages,
    };
  };

  const buildFilters = () => {
    const payload = {};

    if (filters.status) {
      payload.status = filters.status;
    }

    if (filters.partId !== "") {
      payload.partId = Number(filters.partId);
    }

    if (filters.shopifyOrderId !== "") {
      payload.shopifyOrderId = Number(filters.shopifyOrderId);
    }

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

        if (
          selectedRefund &&
          !mapped.items.some((item) => item.id === selectedRefund.id)
        ) {
          setSelectedRefund(null);
          setStatusForm({ status: "", notes: "" });
        }
      })
      .catch((err) => {
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
        setStatusForm({
          status: item?.status || "",
          notes: item?.notes || "",
        });
      })
      .catch((err) => {
        showApiError(err, "Failed to load refund details.");
      })
      .finally(() => {
        setDetailsLoading(false);
      });
  };

  useEffect(() => {
    loadRefunds(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onSearch = (e) => {
    e.preventDefault();
    setSelectedRefund(null);
    setStatusForm({ status: "", notes: "" });
    loadRefunds(0);
  };

  const onReset = () => {
    setFilters({
      status: "",
      partId: "",
      shopifyOrderId: "",
    });
    setSelectedRefund(null);
    setStatusForm({ status: "", notes: "" });

    setTimeout(() => {
      loadRefunds(0);
    }, 0);
  };

  const onSelectRefund = (refund) => {
    if (!refund?.id) return;
    loadRefundById(refund.id);
  };

  const onStatusFormChange = (e) => {
    const { name, value } = e.target;
    setStatusForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    if (statusForm.status === "Denied" && !statusForm.notes.trim()) {
      toastr.warning("Please add notes when denying a refund request.");
      return;
    }

    setSaving(true);

    const payload = {
      status: statusForm.status,
      notes: statusForm.notes,
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
    if (pageData.pageIndex > 0) {
      loadRefunds(pageData.pageIndex - 1);
    }
  };

  const goToNextPage = () => {
    if (pageData.pageIndex + 1 < pageData.totalPages) {
      loadRefunds(pageData.pageIndex + 1);
    }
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
    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onCreateRefundRequest = (e) => {
    e.preventDefault();

    if (!createForm.partId) {
      toastr.warning("Part Id is required.");
      return;
    }

    if (!createForm.reason.trim()) {
      toastr.warning("Reason is required.");
      return;
    }

    setCreating(true);

    const payload = {
      partId: Number(createForm.partId),
      shopifyOrderId: createForm.shopifyOrderId
        ? Number(createForm.shopifyOrderId)
        : null,
      reason: createForm.reason.trim(),
      notes: createForm.notes.trim(),
    };

    refundRequestsService
      .addRefundRequest(payload)
      .then((response) => {
        const newId = response?.item;
        toastr.success("Refund request created.");
        closeCreateModal();
        loadRefunds(0);

        if (newId) {
          loadRefundById(newId);
        }
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
          <p>Review, approve, deny, and finalize refund workflow updates.</p>
        </div>

        <button
          type="button"
          className="refunds-btn primary"
          onClick={openCreateModal}
        >
          Create Refund Request
        </button>
      </div>

      <form className="refunds-filters" onSubmit={onSearch}>
        <div className="refunds-filter-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={onFilterChange}
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="refunds-filter-group">
          <label htmlFor="partId">Part Id</label>
          <input
            id="partId"
            name="partId"
            type="number"
            value={filters.partId}
            onChange={onFilterChange}
            placeholder="e.g. 125"
          />
        </div>

        <div className="refunds-filter-group">
          <label htmlFor="shopifyOrderId">Shopify Order Id</label>
          <input
            id="shopifyOrderId"
            name="shopifyOrderId"
            type="number"
            value={filters.shopifyOrderId}
            onChange={onFilterChange}
            placeholder="e.g. 1234567890"
          />
        </div>

        <div className="refunds-filter-actions">
          <button type="submit" className="refunds-btn primary">
            Search
          </button>
          <button
            type="button"
            className="refunds-btn secondary"
            onClick={onReset}
          >
            Reset
          </button>
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
                  <th>Part</th>
                  <th>Part #</th>
                  <th>Order Id</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr
                    key={refund.id}
                    className={
                      selectedRefund?.id === refund.id ? "selected-row" : ""
                    }
                  >
                    <td>{refund.id}</td>
                    <td>{refund.partName}</td>
                    <td>{refund.partNumber}</td>
                    <td>{refund.shopifyOrderId || "-"}</td>
                    <td className="reason-cell">{refund.reason}</td>
                    <td>
                      <span
                        className={`refund-status status-${String(
                          refund.status || "",
                        ).toLowerCase()}`}
                      >
                        {refund.status}
                      </span>
                    </td>
                    <td>
                      {refund.dateCreated
                        ? new Date(refund.dateCreated).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="refunds-btn small"
                        onClick={() => onSelectRefund(refund)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="refunds-pagination">
            <button
              type="button"
              className="refunds-btn secondary"
              onClick={goToPreviousPage}
              disabled={pageData.pageIndex === 0 || loading}
            >
              Previous
            </button>

            <span>
              Page {pageData.totalPages === 0 ? 0 : pageData.pageIndex + 1} of{" "}
              {pageData.totalPages}
            </span>

            <button
              type="button"
              className="refunds-btn secondary"
              onClick={goToNextPage}
              disabled={
                loading ||
                pageData.totalPages === 0 ||
                pageData.pageIndex + 1 >= pageData.totalPages
              }
            >
              Next
            </button>
          </div>
        </div>

        <div className="refunds-detail-card">
          <div className="refunds-table-header">
            <h3>Request Detail</h3>
          </div>

          {detailsLoading ? (
            <div className="refunds-empty">Loading details...</div>
          ) : !selectedRefund ? (
            <div className="refunds-empty">
              Select a refund request to review it.
            </div>
          ) : (
            <>
              <div className="refunds-detail-grid">
                <div>
                  <strong>Refund Id:</strong> {selectedRefund.id}
                </div>
                <div>
                  <strong>Part Id:</strong> {selectedRefund.partId}
                </div>
                <div>
                  <strong>Part Name:</strong> {selectedRefund.partName}
                </div>
                <div>
                  <strong>Part Number:</strong> {selectedRefund.partNumber}
                </div>
                <div>
                  <strong>Price:</strong>{" "}
                  {typeof selectedRefund.price === "number"
                    ? selectedRefund.price.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })
                    : selectedRefund.price}
                </div>
                <div>
                  <strong>Shopify Order Id:</strong>{" "}
                  {selectedRefund.shopifyOrderId || "-"}
                </div>
                <div>
                  <strong>Created By:</strong> {selectedRefund.createdByName}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {selectedRefund.dateCreated
                    ? new Date(selectedRefund.dateCreated).toLocaleString()
                    : "-"}
                </div>
                <div>
                  <strong>Resolved By:</strong>{" "}
                  {selectedRefund.resolvedByName || "-"}
                </div>
                <div>
                  <strong>Resolved Date:</strong>{" "}
                  {selectedRefund.resolvedDate
                    ? new Date(selectedRefund.resolvedDate).toLocaleString()
                    : "-"}
                </div>
              </div>

              <div className="refunds-text-block">
                <strong>Reason</strong>
                <p>{selectedRefund.reason || "-"}</p>
              </div>

              <div className="refunds-text-block">
                <strong>Current Notes</strong>
                <p>{selectedRefund.notes || "-"}</p>
              </div>

              <div className="refunds-update-panel">
                <div className="refunds-filter-group">
                  <label htmlFor="updateStatus">Update Status</label>
                  <select
                    id="updateStatus"
                    name="status"
                    value={statusForm.status}
                    onChange={onStatusFormChange}
                  >
                    <option value="">Select status</option>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="refunds-filter-group full-width">
                  <label htmlFor="updateNotes">Notes</label>
                  <textarea
                    id="updateNotes"
                    name="notes"
                    value={statusForm.notes}
                    onChange={onStatusFormChange}
                    rows="5"
                    placeholder="Add or update refund notes..."
                  />
                </div>

                <div className="refunds-filter-actions">
                  <button
                    type="button"
                    className="refunds-btn primary"
                    onClick={onUpdateStatus}
                    disabled={saving}
                  >
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
              <button
                type="button"
                className="refunds-btn secondary"
                onClick={closeCreateModal}
                disabled={creating}
              >
                Close
              </button>
            </div>

            <form
              onSubmit={onCreateRefundRequest}
              className="refunds-modal-form"
            >
              <div className="refunds-filter-group">
                <label htmlFor="createPartId">Part Id</label>
                <input
                  id="createPartId"
                  name="partId"
                  type="number"
                  value={createForm.partId}
                  onChange={onCreateFormChange}
                  placeholder="e.g. 125"
                />
              </div>

              <div className="refunds-filter-group">
                <label htmlFor="createShopifyOrderId">Shopify Order Id</label>
                <input
                  id="createShopifyOrderId"
                  name="shopifyOrderId"
                  type="number"
                  value={createForm.shopifyOrderId}
                  onChange={onCreateFormChange}
                  placeholder="e.g. 1234567890"
                />
              </div>

              <div className="refunds-filter-group full-width">
                <label htmlFor="createReason">Reason</label>
                <input
                  id="createReason"
                  name="reason"
                  type="text"
                  value={createForm.reason}
                  onChange={onCreateFormChange}
                  placeholder="Reason for refund request"
                />
              </div>

              <div className="refunds-filter-group full-width">
                <label htmlFor="createNotes">Notes</label>
                <textarea
                  id="createNotes"
                  name="notes"
                  rows="5"
                  value={createForm.notes}
                  onChange={onCreateFormChange}
                  placeholder="Optional notes"
                />
              </div>

              <div className="refunds-filter-actions">
                <button
                  type="submit"
                  className="refunds-btn primary"
                  disabled={creating}
                >
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
