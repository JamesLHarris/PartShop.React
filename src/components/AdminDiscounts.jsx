import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import adminDiscountCodeService from "../service/adminDiscountCodeService";
import partsService from "../service/partsService";
import { API_HOST_PREFIX } from "../service/serviceHelpers";
import "./AdminDiscounts.css";

const initialCreateForm = {
  code: "",
  title: "",
  discountType: "Percentage",
  discountValue: "",
  appliesToType: "General",
  partId: "",
  shopifyProductId: "",
  shopifyVariantId: "",
  customerEmail: "",
  startsAtUtc: "",
  endsAtUtc: "",
  usageLimit: 1,
  oncePerCustomer: true,
  adminNotes: "",
};

const initialFilters = {
  status: "",
  code: "",
  customerEmail: "",
};

const STATUS_OPTIONS = ["Draft", "Active", "Deactivated", "Expired", "Error"];
const DISCOUNT_TYPES = ["Percentage", "FixedAmount"];
const APPLIES_TO_TYPES = ["General", "Product", "Variant", "Part"];

function AdminDiscounts() {
  const [discounts, setDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);

  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [filters, setFilters] = useState(initialFilters);
  const [deactivateNotes, setDeactivateNotes] = useState("");

  const [pageData, setPageData] = useState({
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [partSearch, setPartSearch] = useState({
    q: "",
    partNumber: "",
  });

  const [partResults, setPartResults] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [partSearchLoading, setPartSearchLoading] = useState(false);

  const selectedIsDeactivated = useMemo(() => {
    return selectedDiscount?.status === "Deactivated";
  }, [selectedDiscount]);

  const showApiError = (err, fallback = "Something went wrong.") => {
    const msg =
      err?.response?.data?.errors?.[0] ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      fallback;

    toastr.error(msg);
  };

  const mapPagedResponse = (response) => {
    const paged = response?.item;
    const items = paged?.pagedItems || paged?.items || [];
    const pageIndex = paged?.pageIndex ?? 0;
    const pageSize = paged?.pageSize ?? 10;
    const totalCount = paged?.totalCount ?? 0;
    const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { items, pageIndex, pageSize, totalCount, totalPages };
  };

  const formatCurrency = (value) => {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return value || "-";
    }

    return numberValue.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  };

  const formatDiscountValue = (discount) => {
    if (!discount) return "-";

    if (discount.discountType === "Percentage") {
      return `${Number(discount.discountValue).toLocaleString()}%`;
    }

    return formatCurrency(discount.discountValue);
  };

  const formatDate = (value) => {
    return value ? new Date(value).toLocaleString() : "-";
  };

  const buildFilters = () => {
    const payload = {};

    if (filters.status) payload.status = filters.status;
    if (filters.code.trim()) payload.code = filters.code.trim();
    if (filters.customerEmail.trim()) {
      payload.customerEmail = filters.customerEmail.trim();
    }

    return payload;
  };

  const emptyToNull = (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    return value;
  };

  const numberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    return Number(value);
  };

  const dateOrNull = (value) => {
    if (!value) {
      return null;
    }

    return new Date(value).toISOString();
  };

  const loadDiscounts = (pageIndex = pageData.pageIndex) => {
    setLoading(true);

    adminDiscountCodeService
      .getDiscountCodesPaginated(pageIndex, pageData.pageSize, buildFilters())
      .then((response) => {
        const mapped = mapPagedResponse(response);

        setDiscounts(mapped.items);
        setPageData((prev) => ({
          ...prev,
          pageIndex: mapped.pageIndex,
          pageSize: mapped.pageSize,
          totalCount: mapped.totalCount,
          totalPages: mapped.totalPages,
        }));

        if (
          selectedDiscount &&
          !mapped.items.some((item) => item.id === selectedDiscount.id)
        ) {
          setSelectedDiscount(null);
          setDeactivateNotes("");
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setDiscounts([]);
          setPageData((prev) => ({
            ...prev,
            pageIndex: 0,
            totalCount: 0,
            totalPages: 0,
          }));
          return;
        }

        showApiError(err, "Failed to load discount codes.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadDiscountById = (id) => {
    setDetailsLoading(true);

    adminDiscountCodeService
      .getDiscountCodeById(id)
      .then((response) => {
        setSelectedDiscount(response?.item || null);
        setDeactivateNotes("");
      })
      .catch((err) => {
        showApiError(err, "Failed to load discount details.");
      })
      .finally(() => {
        setDetailsLoading(false);
      });
  };

  useEffect(() => {
    loadDiscounts(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreateFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setCreateForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "appliesToType" && value !== "Part") {
        setSelectedPart(null);
        next.partId = "";
      }

      return next;
    });
  };

  const onFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onSearch = (e) => {
    e.preventDefault();
    setSelectedDiscount(null);
    setDeactivateNotes("");
    loadDiscounts(0);
  };

  const onResetFilters = () => {
    setFilters(initialFilters);
    setSelectedDiscount(null);
    setDeactivateNotes("");
    setTimeout(() => loadDiscounts(0), 0);
  };

  const validateCreateForm = () => {
    if (!createForm.code.trim()) {
      toastr.warning("Discount code is required.");
      return false;
    }

    if (!createForm.discountValue || Number(createForm.discountValue) <= 0) {
      toastr.warning("Discount value must be greater than zero.");
      return false;
    }

    if (
      createForm.discountType === "Percentage" &&
      Number(createForm.discountValue) > 100
    ) {
      toastr.warning("Percentage discount cannot be greater than 100.");
      return false;
    }

    if (
      createForm.endsAtUtc &&
      createForm.startsAtUtc &&
      new Date(createForm.endsAtUtc) <= new Date(createForm.startsAtUtc)
    ) {
      toastr.warning("End date must be after start date.");
      return false;
    }

    if (createForm.appliesToType === "Part" && !createForm.partId) {
      toastr.warning("Search for and select a part first.");
      return false;
    }

    if (
      createForm.appliesToType === "Product" &&
      !createForm.shopifyProductId
    ) {
      toastr.warning(
        "Shopify Product Id is required when Applies To is Product.",
      );
      return false;
    }

    if (
      createForm.appliesToType === "Variant" &&
      !createForm.shopifyVariantId
    ) {
      toastr.warning(
        "Shopify Variant Id is required when Applies To is Variant.",
      );
      return false;
    }

    return true;
  };

  const buildCreatePayload = () => {
    return {
      code: createForm.code.trim().toUpperCase(),
      title: emptyToNull(createForm.title?.trim()),
      discountType: createForm.discountType,
      discountValue: Number(createForm.discountValue),
      appliesToType: createForm.appliesToType,
      partId: numberOrNull(createForm.partId),
      shopifyProductId: numberOrNull(createForm.shopifyProductId),
      shopifyVariantId: numberOrNull(createForm.shopifyVariantId),
      customerEmail: emptyToNull(createForm.customerEmail?.trim()),
      startsAtUtc: dateOrNull(createForm.startsAtUtc),
      endsAtUtc: dateOrNull(createForm.endsAtUtc),
      usageLimit: Number(createForm.usageLimit) || 1,
      oncePerCustomer: Boolean(createForm.oncePerCustomer),
      adminNotes: emptyToNull(createForm.adminNotes?.trim()),
    };
  };

  const onCreateDiscount = (e) => {
    e.preventDefault();

    if (!validateCreateForm()) {
      return;
    }

    setCreating(true);

    adminDiscountCodeService
      .addDiscountCode(buildCreatePayload())
      .then((response) => {
        const id = response?.item;

        toastr.success("Discount code record created.");
        setCreateForm(initialCreateForm);
        loadDiscounts(0);

        if (id) {
          loadDiscountById(id);
        }
      })
      .catch((err) => {
        showApiError(err, "Failed to create discount code.");
      })
      .finally(() => {
        setCreating(false);
      });
  };

  const onSelectDiscount = (discount) => {
    if (!discount?.id) {
      return;
    }

    loadDiscountById(discount.id);
  };

  const onDeactivate = () => {
    if (!selectedDiscount?.id) {
      toastr.warning("Select a discount code first.");
      return;
    }

    if (selectedIsDeactivated) {
      toastr.info("This discount code is already deactivated.");
      return;
    }

    setDeactivating(true);

    adminDiscountCodeService
      .deactivateDiscountCode(selectedDiscount.id, {
        adminNotes: deactivateNotes?.trim() || null,
      })
      .then(() => {
        toastr.success("Discount code deactivated.");
        loadDiscounts(pageData.pageIndex);
        loadDiscountById(selectedDiscount.id);
      })
      .catch((err) => {
        showApiError(err, "Failed to deactivate discount code.");
      })
      .finally(() => {
        setDeactivating(false);
      });
  };

  const goPrev = () => {
    if (pageData.pageIndex > 0) {
      loadDiscounts(pageData.pageIndex - 1);
    }
  };

  const goNext = () => {
    if (pageData.pageIndex + 1 < pageData.totalPages) {
      loadDiscounts(pageData.pageIndex + 1);
    }
  };

  const getPartSearchResults = (response) => {
    const item = response?.item;

    if (Array.isArray(item)) {
      return item;
    }

    if (Array.isArray(item?.pagedItems)) {
      return item.pagedItems;
    }

    if (Array.isArray(item?.items)) {
      return item.items;
    }

    return [];
  };

  const getPartAdminNotes = (part) => {
    return (
      part?.adminNotes ||
      part?.AdminNotes ||
      part?.notes ||
      part?.adminNote ||
      ""
    );
  };

  const truncateText = (text, maxLength = 220) => {
    if (!text) {
      return "";
    }

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.substring(0, maxLength)}...`;
  };

  const getPartImageUrl = (part) => {
    const image =
      part?.image || part?.primaryImage || part?.imageUrl || part?.url;

    if (!image) {
      return null;
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    const cleanImage = image.startsWith("/") ? image : `/${image}`;

    return `${API_HOST_PREFIX}${cleanImage}`;
  };

  const onPartImageError = (e) => {
    e.currentTarget.style.display = "none";

    const fallback = e.currentTarget
      .closest(".discounts-part-image-wrap")
      ?.querySelector(".discounts-part-image-fallback");

    if (fallback) {
      fallback.style.display = "flex";
    }
  };

  const onPartSearchChange = (e) => {
    const { name, value } = e.target;

    setPartSearch((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onSearchParts = () => {
    const q = partSearch.q?.trim();
    const partNumber = partSearch.partNumber?.trim();

    if (!q && !partNumber) {
      toastr.warning("Enter a part name, keyword, or part number.");
      return;
    }

    const params = {};

    if (q) {
      params.q = q;
    }

    if (partNumber) {
      params.PartNumber = partNumber;
    }

    params.MaxRows = 25;

    setPartSearchLoading(true);

    partsService
      .searchPart(params)
      .then((response) => {
        const results = getPartSearchResults(response);
        setPartResults(results);

        if (results.length === 0) {
          toastr.info("No parts found.");
        }
      })
      .catch((err) => {
        showApiError(err, "Failed to search parts.");
      })
      .finally(() => {
        setPartSearchLoading(false);
      });
  };

  const onUsePart = (part) => {
    const partAdminNotes = getPartAdminNotes(part);

    setSelectedPart(part);

    setCreateForm((prev) => {
      const existingDiscountNotes = prev.adminNotes?.trim();

      let nextAdminNotes = prev.adminNotes;

      if (!existingDiscountNotes && partAdminNotes) {
        nextAdminNotes = `Part Admin Notes:\n${partAdminNotes}`;
      }

      return {
        ...prev,
        appliesToType: "Part",
        partId: part.id || "",
        shopifyProductId: part.shopifyProductId || "",
        shopifyVariantId: part.shopifyVariantId || "",
        adminNotes: nextAdminNotes,
      };
    });

    toastr.success(`Selected part #${part.id}`);
  };

  const onClearSelectedPart = () => {
    setSelectedPart(null);

    setCreateForm((prev) => ({
      ...prev,
      partId: "",
      shopifyProductId: "",
      shopifyVariantId: "",
    }));
  };

  const formatPartPrice = (value) => {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return "-";
    }

    return numberValue.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  };

  return (
    <div className="discounts-page">
      <div className="discounts-header">
        <div>
          <h2>Admin Discounts</h2>
          <p>
            Create and manage Shopify discount code records from the Site admin
            workflow.
          </p>
        </div>
      </div>

      <div className="discounts-create-card">
        <h3>Create Discount Code</h3>

        <form className="discounts-form" onSubmit={onCreateDiscount}>
          <div className="discounts-field">
            <label>Code</label>
            <input
              type="text"
              name="code"
              value={createForm.code}
              onChange={onCreateFormChange}
              placeholder="TEST15"
            />
          </div>

          <div className="discounts-field">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={createForm.title}
              onChange={onCreateFormChange}
              placeholder="Test 15 Percent Discount"
            />
          </div>

          <div className="discounts-field">
            <label>Discount Type</label>
            <select
              name="discountType"
              value={createForm.discountType}
              onChange={onCreateFormChange}
            >
              {DISCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="discounts-field">
            <label>
              {createForm.discountType === "Percentage"
                ? "Percentage"
                : "Fixed Amount"}
            </label>
            <input
              type="number"
              name="discountValue"
              min="0.01"
              step="0.01"
              value={createForm.discountValue}
              onChange={onCreateFormChange}
              placeholder={
                createForm.discountType === "Percentage" ? "15" : "25.00"
              }
            />
          </div>

          <div className="discounts-field">
            <label>Applies To</label>
            <select
              name="appliesToType"
              value={createForm.appliesToType}
              onChange={onCreateFormChange}
            >
              {APPLIES_TO_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="discounts-field">
            <label>Selected Part Id</label>
            <input
              type="number"
              name="partId"
              value={createForm.partId}
              onChange={onCreateFormChange}
              placeholder="Search below"
              readOnly={Boolean(selectedPart)}
            />
          </div>

          <div className="discounts-field">
            <label>Shopify Product Id</label>
            <input
              type="number"
              name="shopifyProductId"
              value={createForm.shopifyProductId}
              onChange={onCreateFormChange}
              placeholder="Optional"
            />
          </div>

          <div className="discounts-field">
            <label>Shopify Variant Id</label>
            <input
              type="number"
              name="shopifyVariantId"
              value={createForm.shopifyVariantId}
              onChange={onCreateFormChange}
              placeholder="Optional"
            />
          </div>

          <div className="discounts-field">
            <label>Customer Email</label>
            <input
              type="email"
              name="customerEmail"
              value={createForm.customerEmail}
              onChange={onCreateFormChange}
              placeholder="Optional"
            />
          </div>

          <div className="discounts-field">
            <label>Starts At</label>
            <input
              type="datetime-local"
              name="startsAtUtc"
              value={createForm.startsAtUtc}
              onChange={onCreateFormChange}
            />
          </div>

          <div className="discounts-field">
            <label>Ends At</label>
            <input
              type="datetime-local"
              name="endsAtUtc"
              value={createForm.endsAtUtc}
              onChange={onCreateFormChange}
            />
          </div>

          <div className="discounts-field">
            <label>Usage Limit</label>
            <input
              type="number"
              name="usageLimit"
              min="1"
              value={createForm.usageLimit}
              onChange={onCreateFormChange}
            />
          </div>

          <div className="discounts-field checkbox-field">
            <label>
              <input
                type="checkbox"
                name="oncePerCustomer"
                checked={createForm.oncePerCustomer}
                onChange={onCreateFormChange}
              />
              Once per customer
            </label>
          </div>

          <div className="discounts-field full-width">
            <label>Admin Notes</label>
            <textarea
              name="adminNotes"
              rows="3"
              value={createForm.adminNotes}
              onChange={onCreateFormChange}
              placeholder="Internal notes only"
            />
          </div>

          <div className="discounts-part-search full-width">
            <div className="discounts-part-search-header">
              <div>
                <h4>Find Part</h4>
                <p>
                  Search and attach a part to this discount without leaving the
                  page. Results include the part photo and admin notes for
                  confirmation.
                </p>
              </div>

              {selectedPart ? (
                <button
                  className="discounts-btn secondary"
                  type="button"
                  onClick={onClearSelectedPart}
                >
                  Clear Selected Part
                </button>
              ) : null}
            </div>

            {selectedPart ? (
              <div className="selected-part-card">
                <div className="discounts-part-image-wrap">
                  {getPartImageUrl(selectedPart) ? (
                    <img
                      src={getPartImageUrl(selectedPart)}
                      alt={selectedPart.name || "Selected part"}
                      className="discounts-part-image"
                      onError={onPartImageError}
                    />
                  ) : null}

                  <div
                    className="discounts-part-image-fallback"
                    style={{
                      display: getPartImageUrl(selectedPart) ? "none" : "flex",
                    }}
                  >
                    No Photo
                  </div>
                </div>

                <div className="discounts-part-info">
                  <strong>
                    #{selectedPart.id} {selectedPart.name}
                  </strong>

                  <p>
                    Part Number:{" "}
                    {selectedPart.partNumber || selectedPart.partnumber || "-"}
                  </p>

                  <p>
                    Price: {formatPartPrice(selectedPart.price)} | Status:{" "}
                    {selectedPart.availableStatus || "-"}
                  </p>

                  {getPartAdminNotes(selectedPart) ? (
                    <div className="discounts-part-admin-notes">
                      <strong>Part Admin Notes</strong>
                      <p>{getPartAdminNotes(selectedPart)}</p>
                    </div>
                  ) : (
                    <div className="discounts-part-admin-notes empty">
                      <strong>Part Admin Notes</strong>
                      <p>No admin notes on this part.</p>
                    </div>
                  )}
                </div>

                <span className="discount-status active">Selected</span>
              </div>
            ) : null}

            <div className="discounts-part-search-form">
              <div className="discounts-field">
                <label>Part Name / Keyword</label>
                <input
                  type="text"
                  name="q"
                  value={partSearch.q}
                  onChange={onPartSearchChange}
                  placeholder="Example: bumper, headlight, console"
                />
              </div>

              <div className="discounts-field">
                <label>Part Number</label>
                <input
                  type="text"
                  name="partNumber"
                  value={partSearch.partNumber}
                  onChange={onPartSearchChange}
                  placeholder="Optional"
                />
              </div>

              <div className="discounts-part-search-actions">
                <button
                  className="discounts-btn secondary"
                  type="button"
                  onClick={onSearchParts}
                  disabled={partSearchLoading}
                >
                  {partSearchLoading ? "Searching..." : "Search Parts"}
                </button>
              </div>
            </div>

            {partResults.length > 0 ? (
              <div className="discounts-part-results">
                {partResults.map((part) => (
                  <div className="discounts-part-result" key={part.id}>
                    <div className="discounts-part-image-wrap">
                      {getPartImageUrl(part) ? (
                        <img
                          src={getPartImageUrl(part)}
                          alt={part.name || "Part"}
                          className="discounts-part-image"
                          onError={onPartImageError}
                        />
                      ) : null}

                      <div
                        className="discounts-part-image-fallback"
                        style={{
                          display: getPartImageUrl(part) ? "none" : "flex",
                        }}
                      >
                        No Photo
                      </div>
                    </div>

                    <div className="discounts-part-info">
                      <strong>
                        #{part.id} {part.name}
                      </strong>

                      <p>
                        Part Number: {part.partNumber || part.partnumber || "-"}
                      </p>

                      <p>
                        Price: {formatPartPrice(part.price)} | Status:{" "}
                        {part.availableStatus || "-"}
                      </p>

                      {getPartAdminNotes(part) ? (
                        <div className="discounts-part-admin-notes">
                          <strong>Part Admin Notes</strong>
                          <p>{truncateText(getPartAdminNotes(part), 180)}</p>
                        </div>
                      ) : (
                        <div className="discounts-part-admin-notes empty">
                          <strong>Part Admin Notes</strong>
                          <p>No admin notes on this part.</p>
                        </div>
                      )}
                    </div>

                    <button
                      className="discounts-btn small primary"
                      type="button"
                      onClick={() => onUsePart(part)}
                    >
                      Use Part
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="discounts-actions full-width">
            <button
              className="discounts-btn primary"
              type="submit"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Discount"}
            </button>

            <button
              className="discounts-btn secondary"
              type="button"
              onClick={() => {
                setCreateForm(initialCreateForm);
                setSelectedPart(null);
                setPartResults([]);
                setPartSearch({ q: "", partNumber: "" });
              }}
              disabled={creating}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <form className="discounts-filters" onSubmit={onSearch}>
        <div className="discounts-field">
          <label>Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={onFilterChange}
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="discounts-field">
          <label>Code</label>
          <input
            type="text"
            name="code"
            value={filters.code}
            onChange={onFilterChange}
            placeholder="Search code"
          />
        </div>

        <div className="discounts-field">
          <label>Customer Email</label>
          <input
            type="email"
            name="customerEmail"
            value={filters.customerEmail}
            onChange={onFilterChange}
            placeholder="Search email"
          />
        </div>

        <div className="discounts-filter-actions">
          <button
            className="discounts-btn primary"
            type="submit"
            disabled={loading}
          >
            Search
          </button>
          <button
            className="discounts-btn secondary"
            type="button"
            onClick={onResetFilters}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </form>

      <div className="discounts-layout">
        <div className="discounts-table-card">
          <div className="discounts-table-header">
            <h3>Discount Codes</h3>
            <span>{pageData.totalCount} total</span>
          </div>

          {loading ? (
            <div className="discounts-empty">Loading discounts...</div>
          ) : discounts.length === 0 ? (
            <div className="discounts-empty">No discount codes found.</div>
          ) : (
            <table className="discounts-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Applies To</th>
                  <th>Status</th>
                  <th>Used</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((discount) => (
                  <tr
                    key={discount.id}
                    className={
                      selectedDiscount?.id === discount.id ? "selected-row" : ""
                    }
                  >
                    <td>
                      <strong>{discount.code}</strong>
                      <div className="discounts-muted">{discount.title}</div>
                    </td>
                    <td>{discount.discountType}</td>
                    <td>{formatDiscountValue(discount)}</td>
                    <td>
                      {discount.appliesToType}
                      {discount.partId ? (
                        <div className="discounts-muted">
                          Part #{discount.partId}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`discount-status ${String(
                          discount.status || "",
                        ).toLowerCase()}`}
                      >
                        {discount.status || "-"}
                      </span>
                    </td>
                    <td>
                      {discount.usageCount}/{discount.usageLimit}
                    </td>
                    <td>
                      <button
                        className="discounts-btn small"
                        type="button"
                        onClick={() => onSelectDiscount(discount)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="discounts-pagination">
            <button
              className="discounts-btn secondary"
              type="button"
              onClick={goPrev}
              disabled={loading || pageData.pageIndex <= 0}
            >
              Previous
            </button>

            <span>
              Page {pageData.totalPages === 0 ? 0 : pageData.pageIndex + 1} of{" "}
              {pageData.totalPages}
            </span>

            <button
              className="discounts-btn secondary"
              type="button"
              onClick={goNext}
              disabled={
                loading ||
                pageData.totalPages === 0 ||
                pageData.pageIndex + 1 >= pageData.totalPages
              }
            >
              Next
            </button>
          </div>
        </div>

        <div className="discounts-detail-card">
          <h3>Discount Details</h3>

          {detailsLoading ? (
            <div className="discounts-empty">Loading details...</div>
          ) : !selectedDiscount ? (
            <div className="discounts-empty">
              Select a discount code to view details.
            </div>
          ) : (
            <>
              <div className="discounts-detail-grid">
                <div>
                  <strong>Code</strong>
                  <p>{selectedDiscount.code}</p>
                </div>

                <div>
                  <strong>Status</strong>
                  <p>
                    <span
                      className={`discount-status ${String(
                        selectedDiscount.status || "",
                      ).toLowerCase()}`}
                    >
                      {selectedDiscount.status}
                    </span>
                  </p>
                </div>

                <div>
                  <strong>Title</strong>
                  <p>{selectedDiscount.title || "-"}</p>
                </div>

                <div>
                  <strong>Discount</strong>
                  <p>{formatDiscountValue(selectedDiscount)}</p>
                </div>

                <div>
                  <strong>Applies To</strong>
                  <p>{selectedDiscount.appliesToType || "-"}</p>
                </div>

                <div>
                  <strong>Part</strong>
                  <p>
                    {selectedDiscount.partId
                      ? `#${selectedDiscount.partId} ${selectedDiscount.partName || ""}`
                      : "-"}
                  </p>
                </div>

                <div>
                  <strong>Shopify Product Id</strong>
                  <p>{selectedDiscount.shopifyProductId || "-"}</p>
                </div>

                <div>
                  <strong>Shopify Variant Id</strong>
                  <p>{selectedDiscount.shopifyVariantId || "-"}</p>
                </div>

                <div>
                  <strong>Customer Email</strong>
                  <p>{selectedDiscount.customerEmail || "-"}</p>
                </div>

                <div>
                  <strong>Usage</strong>
                  <p>
                    {selectedDiscount.usageCount}/{selectedDiscount.usageLimit}
                  </p>
                </div>

                <div>
                  <strong>Starts</strong>
                  <p>{formatDate(selectedDiscount.startsAtUtc)}</p>
                </div>

                <div>
                  <strong>Ends</strong>
                  <p>{formatDate(selectedDiscount.endsAtUtc)}</p>
                </div>

                <div>
                  <strong>Created</strong>
                  <p>{formatDate(selectedDiscount.dateCreated)}</p>
                </div>

                <div>
                  <strong>Modified</strong>
                  <p>{formatDate(selectedDiscount.dateModified)}</p>
                </div>

                <div className="full-width">
                  <strong>Shopify Discount GID</strong>
                  <p className="break-text">
                    {selectedDiscount.shopifyDiscountGid || "-"}
                  </p>
                </div>

                <div className="full-width">
                  <strong>Admin Notes</strong>
                  <p className="break-text">
                    {selectedDiscount.adminNotes || "-"}
                  </p>
                </div>
              </div>

              <div className="discounts-deactivate-panel">
                <h4>Deactivate Discount</h4>

                {selectedIsDeactivated ? (
                  <p className="discounts-muted">
                    This discount was deactivated on{" "}
                    {formatDate(selectedDiscount.deactivatedDateUtc)}.
                  </p>
                ) : (
                  <>
                    <textarea
                      rows="3"
                      value={deactivateNotes}
                      onChange={(e) => setDeactivateNotes(e.target.value)}
                      placeholder="Optional deactivation note"
                    />

                    <button
                      className="discounts-btn danger"
                      type="button"
                      onClick={onDeactivate}
                      disabled={deactivating}
                    >
                      {deactivating ? "Deactivating..." : "Deactivate"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDiscounts;
