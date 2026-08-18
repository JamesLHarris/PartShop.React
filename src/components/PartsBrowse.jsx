import { useNavigate, useOutletContext } from "react-router-dom";
import partsService from "../service/partsService";
import toastr from "toastr";
import { useEffect, useMemo, useRef, useState } from "react";
import PartCard from "./PartCard";
import catagoryService from "../service/catagoryService";
import conditionService from "../service/conditionService";
import { SearchItemFilterPanel } from "./SearchItem";
import "./PartsBrowse.css";


const cleanIds = (values = []) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map(Number)
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ).sort((left, right) => left - right);

const toggleId = (values, id) => {
  const current = cleanIds(values);
  return current.includes(id)
    ? current.filter((value) => value !== id)
    : [...current, id].sort((left, right) => left - right);
};

const buildBrowsePath = (filters = {}) => {
  const params = new URLSearchParams();
  const q = String(filters?.q ?? "").trim();

  if (q) params.set("q", q);
  if (filters?.makeId) params.set("makeId", String(filters.makeId));
  if (filters?.modelId) params.set("modelId", String(filters.modelId));

  cleanIds(filters?.categoryIds).forEach((id) =>
    params.append("categoryIds", String(id)),
  );

  cleanIds(filters?.conditionIds).forEach((id) =>
    params.append("conditionIds", String(id)),
  );

  const query = params.toString();
  return `/browse${query ? `?${query}` : ""}`;
};

function PartsBrowse() {
  const {
    filters,
    handleHeaderChange,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    pageSizes,
  } = useOutletContext();

  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [areFiltersLoading, setAreFiltersLoading] = useState(true);

  const [vm, setVm] = useState({
    items: [],
    totalCount: 0,
    isLoading: false,
  });

  // Guards against race conditions from quick filter and pagination changes.
  const requestSeq = useRef(0);

  // These are public lookup endpoints used by the customer header already.
  // Search results themselves continue to use /api/home/search/customer.
  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      catagoryService.getAllCatagories(),
      conditionService.getAllConditions(),
    ]).then(([categoryResult, conditionResult]) => {
      if (!isMounted) return;

      setCategories(
        categoryResult.status === "fulfilled" &&
          Array.isArray(categoryResult.value?.item)
          ? categoryResult.value.item
          : [],
      );

      setConditions(
        conditionResult.status === "fulfilled" &&
          Array.isArray(conditionResult.value?.item)
          ? conditionResult.value.item
          : [],
      );

      setAreFiltersLoading(false);

      if (
        categoryResult.status === "rejected" ||
        conditionResult.status === "rejected"
      ) {
        toastr.warning(
          "Some customer search filters could not be loaded.",
          "Filters",
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadParts = async () => {
      const seq = ++requestSeq.current;

      setVm((prev) => ({ ...prev, isLoading: true }));

      const q = (filters?.q ?? "").trim();
      const makeId = filters?.makeId ?? null;
      const modelId = filters?.modelId ?? null;
      const categoryId = filters?.categoryId ?? null;
      const categoryIds = Array.isArray(filters?.categoryIds)
        ? filters.categoryIds
        : [];
      const conditionIds = Array.isArray(filters?.conditionIds)
        ? filters.conditionIds
        : [];
      const hasFilters = Boolean(
        q ||
          makeId ||
          modelId ||
          categoryId ||
          categoryIds.length > 0 ||
          conditionIds.length > 0,
      );

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
            // Prefer the multi-select category list when present. The legacy
            // single categoryId is kept for older category-navigation links.
            categoryId: categoryIds.length > 0 ? undefined : categoryId,
            categoryIds,
            conditionIds,
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
    filters?.categoryIds?.join(","),
    filters?.conditionIds?.join(","),
    pageIndex,
    pageSize,
  ]);

  const selectedCategoryIds = cleanIds(filters?.categoryIds);
  const selectedConditionIds = cleanIds(filters?.conditionIds);

  const applyCustomerFilters = (patch) => {
    const nextFilters = {
      ...filters,
      ...patch,
      categoryId: null,
    };

    handleHeaderChange?.({
      ...patch,
      categoryId: null,
    });

    setPageIndex(0);
    navigate(buildBrowsePath(nextFilters), { replace: true });
  };

  const handleToggleCategory = (categoryId) => {
    applyCustomerFilters({
      categoryIds: toggleId(selectedCategoryIds, categoryId),
    });
  };

  const handleToggleCondition = (conditionId) => {
    applyCustomerFilters({
      conditionIds: toggleId(selectedConditionIds, conditionId),
    });
  };

  const handleClearRefinements = () => {
    applyCustomerFilters({
      categoryIds: [],
      conditionIds: [],
    });
  };

  const cards = useMemo(
    () =>
      vm.items.map((part) => (
        <PartCard
          key={part.id}
          id={part.id}
          name={part.name}
          make={part.make?.company ?? part.makeName}
          condition={part.condition}
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
      (Array.isArray(filters?.categoryIds) && filters.categoryIds.length > 0) ||
      (Array.isArray(filters?.conditionIds) &&
        filters.conditionIds.length > 0) ||
      (filters?.q ?? "").trim(),
  );

  return (
    <>
      <div className="browse-filter-bar customer-search-item-filters">
        <SearchItemFilterPanel
          categories={categories}
          conditions={conditions}
          selectedCategoryIds={selectedCategoryIds}
          selectedConditionIds={selectedConditionIds}
          onToggleCategory={handleToggleCategory}
          onToggleCondition={handleToggleCondition}
          onClear={handleClearRefinements}
          disabled={vm.isLoading}
          loading={areFiltersLoading}
          title="Refine Results"
          description={
            <>
              Select one or more categories or conditions to narrow your search.
              Multiple selections in the same row are matched as “or,” and the
              category and condition rows are combined as “and.”
            </>
          }
          ariaLabelPrefix="Customer"
        />
      </div>

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
