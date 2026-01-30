import { Outlet } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import HomeHeader from "./HomeHeader";

function Layout() {
  const [filters, setFilters] = useState({
    makeId: null,
    modelId: null,
    categoryId: null,
    q: "",
  });

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [10, 20, 30];

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
