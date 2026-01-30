import { useOutletContext } from "react-router-dom";
import partsService from "../service/partsService";
import toastr from "toastr";
import { useEffect, useMemo, useRef, useState } from "react";
import PartCard from "./PartCard";
import "./PartsBrowse.css";

function PartsBrowse() {
  const { filters, pageIndex, setPageIndex, pageSize, setPageSize, pageSizes } =
    useOutletContext();

  const [vm, setVm] = useState({
    items: [],
    totalCount: 0,
    isLoading: false,
  });

  // Guards against race conditions (fast clicking / quick filter changes)
  const requestSeq = useRef(0);

  useEffect(() => {
    const loadParts = async () => {
      const seq = ++requestSeq.current;

      setVm((prev) => ({ ...prev, isLoading: true }));

      try {
        let response;

        const q = (filters?.q ?? "").trim();
        const hasQuery = q.length > 0;

        // Priority: Search -> Model -> Category -> Recently listed
        if (hasQuery) {
          response = await partsService.customerSearch({
            pageIndex,
            pageSize,
            q,
            makeId: filters?.makeId ?? null,
            modelId: filters?.modelId ?? null,
            categoryId: filters?.categoryId ?? null,
          });
        } else if (filters?.modelId) {
          response = await partsService.getByModelCustomer(
            pageIndex,
            pageSize,
            filters.modelId,
          );
        } else if (filters?.categoryId) {
          response = await partsService.getByCategoryCustomer(
            pageIndex,
            pageSize,
            filters.categoryId,
          );
        } else {
          // Default: recently listed / all available
          response = await partsService.getAllAvailablePartsCustomer(
            pageIndex,
            pageSize,
          );
        }

        // If another request started after this one, ignore this response
        if (seq !== requestSeq.current) return;

        const paged = response?.item;
        const items = paged?.pagedItems ?? [];
        const total = paged?.totalCount ?? 0;

        setVm({
          items,
          totalCount: total,
          isLoading: false,
        });
      } catch (err) {
        if (seq !== requestSeq.current) return;

        console.error("Failed to load parts on Browse.", err);
        toastr.error("Failed to load parts.", "Error");

        setVm((prev) => ({
          ...prev,
          items: [],
          totalCount: 0,
          isLoading: false,
        }));
      }
    };

    loadParts();
  }, [
    filters?.q,
    filters?.makeId,
    filters?.modelId,
    filters?.categoryId,
    pageIndex,
    pageSize,
  ]);

  const cards = useMemo(() => {
    return vm.items.map((part) => (
      <PartCard
        key={part.id}
        id={part.id}
        name={part.name}
        make={part.make?.company ?? part.makeName}
        condition={part.condition}
        tested={part.tested}
        rusted={part.rusted}
        photo={part.image}
        price={part.price}
        description={part.description}
      />
    ));
  }, [vm.items]);

  const totalPages = Math.max(1, Math.ceil(vm.totalCount / pageSize));

  // Cap page buttons (prevents rendering huge button sets)
  const MAX_PAGE_BUTTONS = 9;
  const start = Math.max(0, pageIndex - Math.floor(MAX_PAGE_BUTTONS / 2));
  const end = Math.min(totalPages - 1, start + MAX_PAGE_BUTTONS - 1);
  const pageNumbers = [];
  for (let i = Math.max(0, end - MAX_PAGE_BUTTONS + 1); i <= end; i++) {
    pageNumbers.push(i);
  }

  const hasActiveFilters =
    (filters?.modelId ?? null) !== null ||
    (filters?.categoryId ?? null) !== null ||
    (filters?.q ?? "").trim().length > 0;

  return (
    <>
      {/* Status line (optional but helpful) */}
      <div className="browse-status">
        {vm.isLoading ? (
          <span>Loading…</span>
        ) : (
          <span>
            {vm.totalCount} item{vm.totalCount === 1 ? "" : "s"} found
            {hasActiveFilters ? "" : " (recently listed)"}
          </span>
        )}
      </div>

      {/* Main content */}
      {vm.isLoading ? (
        <div className="part-grid">
          {/* Keep it simple: show nothing or a placeholder row; your CSS can style this */}
        </div>
      ) : vm.items.length === 0 ? (
        <div className="empty-state">
          <h4>No parts found</h4>
          <p>Try clearing filters or adjusting your search.</p>
        </div>
      ) : (
        <div className="part-grid">{cards}</div>
      )}

      {/* Pagination */}
      <div className="pageModifier">
        <div className="pageSize-Selector">
          <label>Page:</label>

          <div className="page-buttons">
            <button
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex <= 0 || totalPages <= 1 || vm.isLoading}
            >
              Prev
            </button>

            {pageNumbers[0] > 0 && (
              <>
                <button
                  onClick={() => setPageIndex(0)}
                  disabled={vm.isLoading}
                  className={pageIndex === 0 ? "active" : ""}
                >
                  1
                </button>
                <span className="page-ellipsis">…</span>
              </>
            )}

            {pageNumbers.map((i) => (
              <button
                key={i}
                onClick={() => setPageIndex(i)}
                className={pageIndex === i ? "active" : ""}
                disabled={totalPages <= 1 || vm.isLoading}
              >
                {i + 1}
              </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <>
                <span className="page-ellipsis">…</span>
                <button
                  onClick={() => setPageIndex(totalPages - 1)}
                  disabled={vm.isLoading}
                  className={pageIndex === totalPages - 1 ? "active" : ""}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() =>
                setPageIndex((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={
                pageIndex >= totalPages - 1 || totalPages <= 1 || vm.isLoading
              }
            >
              Next
            </button>
          </div>
        </div>

        <div className="pageIndex-Selector">
          <label>Page Size:</label>
          {pageSizes.map((size) => (
            <button
              key={size}
              onClick={() => setPageSize(size)}
              className={pageSize === size ? "active" : ""}
              disabled={vm.isLoading}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default PartsBrowse;
