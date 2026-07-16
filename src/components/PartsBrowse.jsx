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

  // Guards against race conditions from quick filter and pagination changes.
  const requestSeq = useRef(0);

  useEffect(() => {
    const loadParts = async () => {
      const seq = ++requestSeq.current;

      setVm((prev) => ({ ...prev, isLoading: true }));

      const q = (filters?.q ?? "").trim();
      const makeId = filters?.makeId ?? null;
      const modelId = filters?.modelId ?? null;
      const categoryId = filters?.categoryId ?? null;
      const hasFilters = Boolean(q || makeId || modelId || categoryId);

      try {
        let response;

        if (hasFilters) {
          // Use one endpoint for all customer filters so keyword, company,
          // model, category, fitments, pagination, and availability agree.
          response = await partsService.customerSearch({
            pageIndex,
            pageSize,
            q: q || undefined,
            makeId,
            modelId,
            categoryId,
            availableId: 1,
          });
        } else {
          response = await partsService.getAllAvailablePartsCustomer(
            pageIndex,
            pageSize,
          );
        }

        if (seq !== requestSeq.current) return;

        const paged = response?.item;

        setVm({
          items: Array.isArray(paged?.pagedItems) ? paged.pagedItems : [],
          totalCount: Number(paged?.totalCount ?? 0),
          isLoading: false,
        });
      } catch (error) {
        if (seq !== requestSeq.current) return;

        // The API currently returns 404 when a valid search has zero rows.
        // Treat that as an empty result instead of an application failure.
        if (error?.response?.status === 404) {
          setVm({
            items: [],
            totalCount: 0,
            isLoading: false,
          });
          return;
        }

        console.error("Failed to load parts on Browse.", error);
        toastr.error("Failed to load parts.", "Error");

        setVm({
          items: [],
          totalCount: 0,
          isLoading: false,
        });
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

  const cards = useMemo(
    () =>
      vm.items.map((part) => (
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
      )),
    [vm.items],
  );

  const totalPages = Math.max(1, Math.ceil(vm.totalCount / pageSize));
  const maxPageButtons = 9;
  const start = Math.max(0, pageIndex - Math.floor(maxPageButtons / 2));
  const end = Math.min(totalPages - 1, start + maxPageButtons - 1);
  const pageNumbers = [];

  for (let i = Math.max(0, end - maxPageButtons + 1); i <= end; i += 1) {
    pageNumbers.push(i);
  }

  const hasActiveFilters = Boolean(
    filters?.makeId ||
      filters?.modelId ||
      filters?.categoryId ||
      (filters?.q ?? "").trim(),
  );

  return (
    <>
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

      {vm.isLoading ? (
        <div className="part-grid" />
      ) : vm.items.length === 0 ? (
        <div className="empty-state">
          <h4>No parts found</h4>
          <p>Try clearing filters or adjusting your search.</p>
        </div>
      ) : (
        <div className="part-grid">{cards}</div>
      )}

      <div className="pageModifier">
        <div className="pageSize-Selector">
          <label>Page:</label>

          <div className="page-buttons">
            <button
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
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

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPageIndex(pageNumber)}
                className={pageIndex === pageNumber ? "active" : ""}
                disabled={totalPages <= 1 || vm.isLoading}
              >
                {pageNumber + 1}
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
                setPageIndex((current) =>
                  Math.min(totalPages - 1, current + 1),
                )
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
