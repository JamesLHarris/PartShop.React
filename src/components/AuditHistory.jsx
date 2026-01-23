import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import auditService from "../service/auditService";

const AuditHistory = ({ partId, pageSize = 10 }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pagedItems, setPagedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Determines which API endpoint to call
  const isPartMode = !!partId;

  // Load history data (runs on initial load & when changing pageIndex)
  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const apiCall = isPartMode
      ? auditService.getAuditByPartId(partId, pageIndex, pageSize)
      : auditService.getAuditByRecent(pageIndex, pageSize);

    apiCall
      .then((data) => {
        // You generally return response.item in onGlobalSuccess
        const page = data.item;
        console.log("DATATATA", data.item);

        setPagedItems(page.pagedItems || []);
        setTotalCount(page.totalCount || 0);
        setPageIndex(page.pageIndex || 0);
      })
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [isPartMode, partId, pageIndex, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pagination controls
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const onPrev = () => pageIndex > 0 && setPageIndex((p) => p - 1);
  const onNext = () => pageIndex + 1 < totalPages && setPageIndex((p) => p + 1);

  // Table row renderer
  const renderRow = (audit) => {
    const {
      id,
      part,
      partId,
      changeType,
      columnName,
      oldValue,
      newValue,
      changedOn,
      user,
      changedByUserId,
      changedByUser,
    } = audit;

    const partLabel = part
      ? `${part.name ?? "Part"} (#${part.id})`
      : `Part #${partId}`;

    const userLabel = user?.name || changedByUser || `User #${changedByUserId}`;

    const timestamp = changedOn ? new Date(changedOn).toLocaleString() : "";

    return (
      <tr key={id}>
        {!isPartMode && <td>{partLabel}</td>}
        <td>{timestamp}</td>
        <td>{changeType}</td>
        <td>{columnName}</td>
        <td>{oldValue}</td>
        <td>{newValue}</td>
        <td>{userLabel}</td>
      </tr>
    );
  };

  return (
    <div className="card mt-3">
      <div className="card-header fw-bold">
        {isPartMode
          ? `Change History for Part #${partId}`
          : "Recent Inventory Changes"}
      </div>

      <div className="card-body">
        {isLoading && <div>Loading audit history...</div>}

        {!isLoading && error && (
          <div className="text-danger">
            Error loading audit history: {error.message}
          </div>
        )}

        {!isLoading && !error && pagedItems.length === 0 && (
          <div>No audit entries found.</div>
        )}

        {!isLoading && !error && pagedItems.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  {!isPartMode && <th>Part</th>}
                  <th>Date / Time</th>
                  <th>Change Type</th>
                  <th>Field</th>
                  <th>Old Value</th>
                  <th>New Value</th>
                  <th>Changed By</th>
                </tr>
              </thead>
              <tbody>{pagedItems.map(renderRow)}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-footer d-flex justify-content-between">
        <div>
          Page {pageIndex + 1} of {totalPages}{" "}
          <span className="text-muted">({totalCount} total changes)</span>
        </div>

        <div>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={onPrev}
            disabled={pageIndex === 0 || isLoading}
          >
            Previous
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={onNext}
            disabled={pageIndex + 1 >= totalPages || isLoading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

AuditHistory.propTypes = {
  // If provided → audit history for a specific part
  // If omitted → global recent audits
  partId: PropTypes.number,
  pageSize: PropTypes.number,
};

export default AuditHistory;
