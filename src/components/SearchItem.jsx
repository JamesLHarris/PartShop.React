import React, { useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import toastr from "toastr";
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

function SearchItem() {
  const [formData, setFormData] = useState({
    name: "",
    partNumber: "",
  });

  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const requestSequence = useRef(0);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const nameQuery = formData.name.trim();
    const partNumberQuery = formData.partNumber.trim();

    if (!nameQuery && !partNumberQuery) {
      toastr.info("Enter a part name or part number.");
      return;
    }

    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setHasSearched(true);
    setPageIndex(0);

    try {
      /*
       * The admin search endpoint accepts a single q value and searches names,
       * part numbers, makes, models, and categories. Use whichever field is
       * populated first, then apply the second field locally when both are
       * supplied.
       */
      const response = await partsService.searchPart({
        q: nameQuery || partNumberQuery,
      });

      if (sequence !== requestSequence.current) {
        return;
      }

      let nextResults = Array.isArray(response?.item)
        ? response.item
        : [];

      if (nameQuery && partNumberQuery) {
        const normalizedPartNumber =
          normalizeSearchText(partNumberQuery);

        nextResults = nextResults.filter((part) =>
          normalizeSearchText(part.partNumber).includes(
            normalizedPartNumber,
          ),
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

  const handleClear = () => {
    requestSequence.current += 1;
    setFormData({
      name: "",
      partNumber: "",
    });
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
            Search by part name, part number, or both. Press Enter from either
            field to run the search.
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
                !formData.partNumber
              }
            >
              Clear
            </button>
          </div>
        </form>
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
                  : "Enter search criteria above."}
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
            Results will appear here after a search.
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state locate-part-empty-state">
            <h3>No parts found</h3>
            <p>Try a broader name or verify the part number.</p>
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
                        setPageIndex((current) =>
                          Math.max(0, current - 1),
                        )
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
                        aria-current={
                          page === pageIndex ? "page" : undefined
                        }
                      >
                        {page + 1}
                      </button>
                    ))}

                    {pageNumbers[pageNumbers.length - 1] <
                      totalPages - 1 && (
                      <>
                        <span className="page-ellipsis">…</span>
                        <button
                          type="button"
                          onClick={() =>
                            setPageIndex(totalPages - 1)
                          }
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
                      disabled={
                        pageIndex >= totalPages - 1 || isLoading
                      }
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
