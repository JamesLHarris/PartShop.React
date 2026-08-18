import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import toastr from "toastr";
import catagoryService from "../service/catagoryService";
import conditionService from "../service/conditionService";
import partsService from "../service/partsService";
import AdminCard from "./AdminCard";
import "./PartsBrowse.css";
import "./SearchItem.css";

const PAGE_SIZES = [10, 20, 30];

const normalizeSearchText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const idOf = (item) =>
  Number(
    item?.id ??
      item?.Id ??
      item?.categoryId ??
      item?.CategoryId ??
      item?.catagoryId ??
      item?.CatagoryId ??
      item?.conditionId ??
      item?.ConditionId,
  );

const nameOf = (item) =>
  String(
    item?.name ??
      item?.Name ??
      item?.categoryName ??
      item?.CategoryName ??
      item?.catagoryName ??
      item?.CatagoryName ??
      item?.conditionName ??
      item?.ConditionName ??
      "Unnamed",
  ).trim();

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

export function SearchItemFilterPanel({
  categories = [],
  conditions = [],
  selectedCategoryIds = [],
  selectedConditionIds = [],
  onToggleCategory,
  onToggleCondition,
  onClear,
  disabled = false,
  loading = false,
  title = "Refine Inventory",
  description = (
    <>
      Multiple selections in the same row are matched as “or.” The category
      and condition rows are combined as “and.”
    </>
  ),
  ariaLabelPrefix = "Admin",
}) {
  const cleanCategoryIds = cleanIds(selectedCategoryIds);
  const cleanConditionIds = cleanIds(selectedConditionIds);

  const sortedCategories = useMemo(
    () =>
      (Array.isArray(categories) ? categories : [])
        .filter((item) => idOf(item) > 0 && nameOf(item))
        .sort((left, right) =>
          nameOf(left).localeCompare(nameOf(right), undefined, {
            sensitivity: "base",
          }),
        ),
    [categories],
  );

  const sortedConditions = useMemo(
    () =>
      (Array.isArray(conditions) ? conditions : [])
        .filter((item) => idOf(item) > 0 && nameOf(item))
        .sort((left, right) =>
          nameOf(left).localeCompare(nameOf(right), undefined, {
            sensitivity: "base",
          }),
        ),
    [conditions],
  );

  const hasSelections =
    cleanCategoryIds.length > 0 || cleanConditionIds.length > 0;

  return (
    <section className="locate-filter-panel" aria-label={title}>
      <div className="locate-filter-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        {hasSelections && (
          <button
            type="button"
            className="locate-filter-clear"
            onClick={onClear}
            disabled={disabled}
          >
            Clear category &amp; condition
          </button>
        )}
      </div>

      {loading ? (
        <div className="locate-filter-loading" role="status">
          Loading inventory filters…
        </div>
      ) : (
        <div className="locate-filter-groups">
          <div className="locate-filter-group">
            <div className="locate-filter-label">
              <span>Categories</span>
              {cleanCategoryIds.length > 0 && (
                <small>{cleanCategoryIds.length} selected</small>
              )}
            </div>

            <div
              className="locate-filter-chips"
              aria-label={`${ariaLabelPrefix} category filters`}
            >
              {sortedCategories.map((category) => {
                const categoryId = idOf(category);
                const selected = cleanCategoryIds.includes(categoryId);

                return (
                  <button
                    key={categoryId}
                    type="button"
                    className={`locate-filter-chip ${
                      selected ? "is-selected" : ""
                    }`}
                    aria-pressed={selected}
                    onClick={() => onToggleCategory?.(categoryId)}
                    disabled={disabled}
                  >
                    {nameOf(category)}
                    {selected ? <span aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="locate-filter-group">
            <div className="locate-filter-label">
              <span>Condition</span>
              {cleanConditionIds.length > 0 && (
                <small>{cleanConditionIds.length} selected</small>
              )}
            </div>

            <div
              className="locate-filter-chips"
              aria-label={`${ariaLabelPrefix} condition filters`}
            >
              {sortedConditions.map((condition) => {
                const conditionId = idOf(condition);
                const selected = cleanConditionIds.includes(conditionId);

                return (
                  <button
                    key={conditionId}
                    type="button"
                    className={`locate-filter-chip ${
                      selected ? "is-selected" : ""
                    }`}
                    aria-pressed={selected}
                    onClick={() => onToggleCondition?.(conditionId)}
                    disabled={disabled}
                  >
                    {nameOf(condition)}
                    {selected ? <span aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SearchItem() {
  const [formData, setFormData] = useState({
    name: "",
    partNumber: "",
  });

  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedConditionIds, setSelectedConditionIds] = useState([]);
  const [areFiltersLoading, setAreFiltersLoading] = useState(true);

  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const requestSequence = useRef(0);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      catagoryService.getAllCatagories(),
      conditionService.getAllConditions(),
    ]).then(([categoryResult, conditionResult]) => {
      if (!isMounted) {
        return;
      }

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
          "Some inventory filters could not be loaded.",
          "Filters",
        );
      }
    });

    return () => {
      isMounted = false;
      requestSequence.current += 1;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const executeSearch = async ({
    categoryIds = selectedCategoryIds,
    conditionIds = selectedConditionIds,
    showEmptyCriteriaMessage = true,
  } = {}) => {
    const nameQuery = formData.name.trim();
    const partNumberQuery = formData.partNumber.trim();
    const cleanCategoryIds = cleanIds(categoryIds);
    const cleanConditionIds = cleanIds(conditionIds);

    const hasCriteria =
      Boolean(nameQuery) ||
      Boolean(partNumberQuery) ||
      cleanCategoryIds.length > 0 ||
      cleanConditionIds.length > 0;

    if (!hasCriteria) {
      if (showEmptyCriteriaMessage) {
        toastr.info(
          "Enter a part name or part number, or select a category or condition.",
        );
      }

      setResults([]);
      setHasSearched(false);
      setPageIndex(0);
      return;
    }

    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setHasSearched(true);
    setPageIndex(0);

    try {
      /*
       * The admin endpoint accepts one general q value. When both text fields
       * are supplied, use the name for the server search and apply the part
       * number as a second local refinement. Category and condition lists are
       * always applied by SQL so multi-select results are complete.
       */
      const response = await partsService.searchPart({
        q: nameQuery || partNumberQuery,
        categoryIds: cleanCategoryIds,
        conditionIds: cleanConditionIds,
      });

      if (sequence !== requestSequence.current) {
        return;
      }

      let nextResults = Array.isArray(response?.item)
        ? response.item
        : [];

      if (nameQuery && partNumberQuery) {
        const normalizedPartNumber = normalizeSearchText(partNumberQuery);

        nextResults = nextResults.filter((part) =>
          normalizeSearchText(part.partNumber).includes(normalizedPartNumber),
        );
      }

      setResults(nextResults);

      if (nextResults.length === 0) {
        toastr.info("No matching parts were found.");
      }
    } catch (error) {
      if (sequence !== requestSequence.current) {
        return;
      }

      console.error("Failed to search parts on Locate Part.", error);
      setResults([]);
      toastr.error("Unable to search parts right now.", "Search Failed");
    } finally {
      if (sequence === requestSequence.current) {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isLoading) {
      executeSearch();
    }
  };

  const handleToggleCategory = (categoryId) => {
    if (isLoading) {
      return;
    }

    const nextIds = toggleId(selectedCategoryIds, categoryId);
    setSelectedCategoryIds(nextIds);
    executeSearch({ categoryIds: nextIds });
  };

  const handleToggleCondition = (conditionId) => {
    if (isLoading) {
      return;
    }

    const nextIds = toggleId(selectedConditionIds, conditionId);
    setSelectedConditionIds(nextIds);
    executeSearch({ conditionIds: nextIds });
  };

  const handleClearFilters = () => {
    if (isLoading) {
      return;
    }

    setSelectedCategoryIds([]);
    setSelectedConditionIds([]);

    const hasText = formData.name.trim() || formData.partNumber.trim();

    if (hasText) {
      executeSearch({
        categoryIds: [],
        conditionIds: [],
        showEmptyCriteriaMessage: false,
      });
    } else {
      requestSequence.current += 1;
      setResults([]);
      setHasSearched(false);
      setPageIndex(0);
    }
  };

  const handleClear = () => {
    requestSequence.current += 1;
    setFormData({
      name: "",
      partNumber: "",
    });
    setSelectedCategoryIds([]);
    setSelectedConditionIds([]);
    setResults([]);
    setHasSearched(false);
    setIsLoading(false);
    setPageIndex(0);
  };

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));

  const visibleResults = useMemo(() => {
    const start = pageIndex * pageSize;
    return results.slice(start, start + pageSize);
  }, [results, pageIndex, pageSize]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 9;
    const start = Math.max(
      0,
      Math.min(
        pageIndex - Math.floor(maxButtons / 2),
        totalPages - maxButtons,
      ),
    );
    const end = Math.min(totalPages, start + maxButtons);

    return Array.from(
      { length: Math.max(0, end - start) },
      (_, offset) => start + offset,
    );
  }, [pageIndex, totalPages]);

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setPageIndex(0);
  };

  const hasFilterSelections =
    selectedCategoryIds.length > 0 || selectedConditionIds.length > 0;

  return (
    <main className="locate-part-page">
      <section
        className="locate-part-search-card"
        aria-labelledby="locate-part-title"
      >
        <div className="locate-part-heading">
          <p className="locate-part-eyebrow">Admin Inventory</p>
          <h1 id="locate-part-title">Locate Part</h1>
          <p>
            Search by part name, part number, category, condition, or any
            combination of those options.
          </p>
        </div>

        <form className="locate-part-form" onSubmit={handleSubmit}>
          <label htmlFor="locate-part-name">
            Part Name
            <input
              id="locate-part-name"
              name="name"
              type="search"
              value={formData.name}
              onChange={handleChange}
              autoComplete="off"
              placeholder="Example: 911 engine mount"
              disabled={isLoading}
            />
          </label>

          <label htmlFor="locate-part-number">
            Part Number
            <input
              id="locate-part-number"
              name="partNumber"
              type="search"
              value={formData.partNumber}
              onChange={handleChange}
              autoComplete="off"
              placeholder="Example: 20-26-07-21"
              disabled={isLoading}
            />
          </label>

          <div className="locate-part-actions">
            <button
              type="submit"
              className="locate-part-search-button"
              disabled={isLoading}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              className="locate-part-clear-button"
              onClick={handleClear}
              disabled={
                isLoading &&
                !formData.name &&
                !formData.partNumber &&
                !hasFilterSelections
              }
            >
              Clear
            </button>
          </div>
        </form>

        <SearchItemFilterPanel
          categories={categories}
          conditions={conditions}
          selectedCategoryIds={selectedCategoryIds}
          selectedConditionIds={selectedConditionIds}
          onToggleCategory={handleToggleCategory}
          onToggleCondition={handleToggleCondition}
          onClear={handleClearFilters}
          disabled={isLoading}
          loading={areFiltersLoading}
          title="Refine Inventory"
          ariaLabelPrefix="Admin"
        />
      </section>

      <section
        className="locate-part-results"
        aria-labelledby="locate-results-title"
      >
        <div className="locate-part-results-header">
          <div>
            <h2 id="locate-results-title">Search Results</h2>
            <p className="locate-part-result-count" aria-live="polite">
              {isLoading
                ? "Searching..."
                : hasSearched
                  ? `${results.length} part${
                      results.length === 1 ? "" : "s"
                    } found`
                  : "Enter search criteria or select filters above."}
            </p>
          </div>

          {hasSearched && results.length > 0 && (
            <div className="locate-part-page-size">
              <span>Page size</span>
              <div>
                {PAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={pageSize === size ? "active" : ""}
                    onClick={() => handlePageSizeChange(size)}
                    disabled={isLoading}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="locate-part-message" role="status">
            Searching inventory...
          </div>
        ) : !hasSearched ? (
          <div className="locate-part-message">
            Results will appear here after a search or filter selection.
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state locate-part-empty-state">
            <h3>No parts found</h3>
            <p>Try broader text or remove one of the selected filters.</p>
          </div>
        ) : (
          <>
            <div className="part-grid locate-part-grid">
              {visibleResults.map((part) => (
                <AdminCard
                  key={part.id}
                  id={part.id}
                  name={part.name}
                  photo={part.image}
                  price={part.price}
                  conditionName={part.conditionName}
                  partNumber={part.partNumber}
                  quantity={part.quantity}
                  availableStatus={part.availableStatus}
                  siteName={part.siteName}
                  boxName={part.boxName}
                  otherBox={part.otherBox}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                className="pageModifier locate-part-pagination"
                aria-label="Locate Part result pages"
              >
                <div className="pageSize-Selector">
                  <label>Page</label>

                  <div className="page-buttons">
                    <button
                      type="button"
                      onClick={() =>
                        setPageIndex((current) => Math.max(0, current - 1))
                      }
                      disabled={pageIndex === 0 || isLoading}
                    >
                      Prev
                    </button>

                    {pageNumbers[0] > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPageIndex(0)}
                          disabled={isLoading}
                        >
                          1
                        </button>
                        <span className="page-ellipsis">…</span>
                      </>
                    )}

                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={page === pageIndex ? "active" : ""}
                        onClick={() => setPageIndex(page)}
                        disabled={isLoading}
                        aria-current={page === pageIndex ? "page" : undefined}
                      >
                        {page + 1}
                      </button>
                    ))}

                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                      <>
                        <span className="page-ellipsis">…</span>
                        <button
                          type="button"
                          onClick={() => setPageIndex(totalPages - 1)}
                          disabled={isLoading}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setPageIndex((current) =>
                          Math.min(totalPages - 1, current + 1),
                        )
                      }
                      disabled={pageIndex >= totalPages - 1 || isLoading}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      <Outlet />
    </main>
  );
}

export default SearchItem;
