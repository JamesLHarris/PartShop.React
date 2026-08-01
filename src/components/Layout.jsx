import { Outlet, useLocation } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import HomeHeader from "./HomeHeader";
import SaleBanner from "./SaleBanner";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseIdList = (params, pluralName, legacyName) => {
  const rawValues = params.getAll(pluralName);

  if (rawValues.length === 0 && legacyName) {
    const legacyValue = params.get(legacyName);
    if (legacyValue) rawValues.push(legacyValue);
  }

  return Array.from(
    new Set(
      rawValues
        .flatMap((value) => String(value).split(","))
        .map(parsePositiveInt)
        .filter(Boolean),
    ),
  ).sort((left, right) => left - right);
};

function Layout() {
  const location = useLocation();
  const [filters, setFilters] = useState({
    makeId: null,
    modelId: null,
    categoryId: null,
    categoryIds: [],
    conditionIds: [],
    q: "",
  });

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const pageSizes = [10, 20, 30];

  // Keep Browse filters reload-safe and shareable through the URL.
  useEffect(() => {
    if (location.pathname !== "/browse") return;

    const params = new URLSearchParams(location.search);
    const categoryIds = parseIdList(params, "categoryIds", "categoryId");
    const conditionIds = parseIdList(params, "conditionIds", "conditionId");
    const makeId = parsePositiveInt(params.get("makeId"));
    const modelId = parsePositiveInt(params.get("modelId"));
    const q = String(params.get("q") ?? "").trim();

    setFilters((previous) => {
      const next = {
        makeId,
        modelId,
        categoryId: categoryIds.length === 1 ? categoryIds[0] : null,
        categoryIds,
        conditionIds,
        q,
      };

      const unchanged =
        previous.makeId === next.makeId &&
        previous.modelId === next.modelId &&
        previous.categoryId === next.categoryId &&
        previous.q === next.q &&
        previous.categoryIds.join(",") === next.categoryIds.join(",") &&
        previous.conditionIds.join(",") === next.conditionIds.join(",");

      return unchanged ? previous : next;
    });
  }, [location.pathname, location.search]);

  const handleHeaderChange = (patch) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  // Reset to the first page whenever any query-driving filter changes.
  useEffect(() => {
    setPageIndex(0);
  }, [
    filters.makeId,
    filters.modelId,
    filters.categoryId,
    filters.q,
    filters.categoryIds.join(","),
    filters.conditionIds.join(","),
  ]);

  useEffect(() => {
    setPageIndex(0);
  }, [pageSize]);

  const outletContext = useMemo(
    () => ({
      filters,
      handleHeaderChange,
      pageIndex,
      setPageIndex,
      pageSize,
      setPageSize,
      pageSizes,
    }),
    [filters, pageIndex, pageSize],
  );

  const isAdminRoute = location.pathname.toLowerCase().startsWith("/admin");

  return (
    <div className="layout-wrapper">
      {!isAdminRoute ? <SaleBanner /> : null}

      <header className="App-header">
        <HomeHeader value={filters} onChange={handleHeaderChange} />
      </header>

      <main>
        <Outlet context={outletContext} />
      </main>
    </div>
  );
}

export default Layout;
