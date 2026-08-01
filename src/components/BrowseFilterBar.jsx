import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import catagoryService from "../service/catagoryService";
import conditionService from "../service/conditionService";

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

const buildBrowseSearch = (filters) => {
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
  return query ? `?${query}` : "";
};

function BrowseFilterBar({ filters, onChange, disabled = false }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedCategories = useMemo(
    () =>
      categories
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
      conditions
        .filter((item) => idOf(item) > 0 && nameOf(item))
        .sort((left, right) =>
          nameOf(left).localeCompare(nameOf(right), undefined, {
            sensitivity: "base",
          }),
        ),
    [conditions],
  );

  const selectedCategoryIds = cleanIds(filters?.categoryIds);
  const selectedConditionIds = cleanIds(filters?.conditionIds);
  const hasSelections =
    selectedCategoryIds.length > 0 || selectedConditionIds.length > 0;

  const applyFilters = (patch) => {
    const nextFilters = {
      ...filters,
      ...patch,
      categoryId: null,
    };

    onChange?.(patch);
    navigate(`/browse${buildBrowseSearch(nextFilters)}`, { replace: true });
  };

  const toggleCategory = (categoryId) => {
    applyFilters({
      categoryId: null,
      categoryIds: toggleId(selectedCategoryIds, categoryId),
    });
  };

  const toggleCondition = (conditionId) => {
    applyFilters({
      conditionIds: toggleId(selectedConditionIds, conditionId),
    });
  };

  const clearRefinements = () => {
    applyFilters({
      categoryId: null,
      categoryIds: [],
      conditionIds: [],
    });
  };

  return (
    <section className="browse-filter-bar" aria-labelledby="browse-filter-title">
      <div className="browse-filter-bar__heading">
        <div>
          <h2 id="browse-filter-title">Refine Results</h2>
          <p>
            Choose more than one option. Selections within a row are matched as
            “or,” while category and condition rows are combined as “and.”
          </p>
        </div>

        {hasSelections && (
          <button
            type="button"
            className="browse-filter-clear"
            onClick={clearRefinements}
            disabled={disabled}
          >
            Clear category &amp; condition
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="browse-filter-loading" role="status">
          Loading filters…
        </div>
      ) : (
        <div className="browse-filter-groups">
          <div className="browse-filter-group">
            <div className="browse-filter-label">
              <span>Categories</span>
              {selectedCategoryIds.length > 0 && (
                <small>{selectedCategoryIds.length} selected</small>
              )}
            </div>

            <div className="browse-filter-chips" aria-label="Category filters">
              {sortedCategories.map((category) => {
                const categoryId = idOf(category);
                const selected = selectedCategoryIds.includes(categoryId);

                return (
                  <button
                    key={categoryId}
                    type="button"
                    className={`browse-filter-chip ${selected ? "is-selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleCategory(categoryId)}
                    disabled={disabled}
                  >
                    {nameOf(category)}
                    {selected ? <span aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="browse-filter-group">
            <div className="browse-filter-label">
              <span>Condition</span>
              {selectedConditionIds.length > 0 && (
                <small>{selectedConditionIds.length} selected</small>
              )}
            </div>

            <div className="browse-filter-chips" aria-label="Condition filters">
              {sortedConditions.map((condition) => {
                const conditionId = idOf(condition);
                const selected = selectedConditionIds.includes(conditionId);

                return (
                  <button
                    key={conditionId}
                    type="button"
                    className={`browse-filter-chip ${selected ? "is-selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleCondition(conditionId)}
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

export default BrowseFilterBar;
