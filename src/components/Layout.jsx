import { Outlet, useLocation } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import HomeHeader from "./HomeHeader";

function Layout() {
  const location = useLocation();
  const [filters, setFilters] = useState({
    makeId: null,
    modelId: null,
    categoryId: null,
    q: "",
  });

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [10, 20, 30];

  // Allow category cards to create a shareable/reload-safe Browse URL.
  useEffect(() => {
    if (location.pathname !== "/browse") return;

    const params = new URLSearchParams(location.search);
    const rawCategoryId = params.get("categoryId");
    if (!rawCategoryId) return;

    const categoryId = Number(rawCategoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) return;

    setFilters((prev) => {
      if (
        prev.categoryId === categoryId &&
        prev.makeId == null &&
        prev.modelId == null &&
        prev.q === ""
      ) {
        return prev;
      }

      return {
        ...prev,
        categoryId,
        makeId: null,
        modelId: null,
        q: "",
      };
    });
  }, [location.pathname, location.search]);

  const handleHeaderChange = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  // Reset to first page whenever the query-driving filters change
  useEffect(() => {
    setPageIndex(0);
  }, [filters.makeId, filters.modelId, filters.categoryId, filters.q]);

  // Reset to first page whenever page size changes (prevents landing on invalid pages)
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
    [filters, pageIndex, pageSize, pageSizes],
  );

  return (
    <div className="layout-wrapper">
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
