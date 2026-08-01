import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import adminDiscountCodeService from "../service/adminDiscountCodeService";
import catagoryService from "../service/catagoryService";
import conditionService from "../service/conditionService";
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
  categoryId: "",
  conditionId: "",
  matchAllRules: true,
  autoMaintainEligibility: true,
  customerEmail: "",
  startsAtUtc: "",
  endsAtUtc: "",
  usageLimit: 1,
  oncePerCustomer: true,
  adminNotes: "",
  showSiteBanner: false,
  bannerHeadline: "",
  bannerMessage: "",
  bannerLinkText: "Shop Sale",
  bannerLinkUrl: "/browse",
  bannerPriority: 0,
};

const initialFilters = {
  status: "",
  code: "",
  customerEmail: "",
};

const STATUS_OPTIONS = ["Draft", "Active", "Deactivated", "Expired", "Error"];
const DISCOUNT_TYPES = [
  { value: "Percentage", label: "Percentage" },
  { value: "FixedAmount", label: "Fixed amount" },
];
const APPLIES_TO_TYPES = [
  { value: "General", label: "Entire store" },
  { value: "Part", label: "Specific Site part" },
  { value: "Product", label: "Specific Shopify product" },
  { value: "Variant", label: "Specific Shopify variant" },
  { value: "CollectionRule", label: "Category / condition rule" },
];

function AdminDiscounts() {
  const [discounts, setDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [filters, setFilters] = useState(initialFilters);
  const [deactivateNotes, setDeactivateNotes] = useState("");
  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

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

  const selectedIsDeactivated = useMemo(
    () => selectedDiscount?.status === "Deactivated",
    [selectedDiscount],
  );

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => String(category.id) === String(createForm.categoryId),
      ) || null,
    [categories, createForm.categoryId],
  );

  const selectedCondition = useMemo(
    () =>
      conditions.find(
        (condition) => String(condition.id) === String(createForm.conditionId),
      ) || null,
    [conditions, createForm.conditionId],
  );

  const collectionRulePreview = useMemo(() => {
    const rules = [];

    if (selectedCategory) {
      rules.push(`Category: ${selectedCategory.name || selectedCategory.label}`);
    }

    if (selectedCondition) {
      rules.push(`Condition: ${selectedCondition.name || selectedCondition.label}`);
    }

    return rules;
  }, [selectedCategory, selectedCondition]);

  const saleDuration = useMemo(() => {
    if (!createForm.startsAtUtc || !createForm.endsAtUtc) {
      return null;
    }

    const start = new Date(createForm.startsAtUtc);
    const end = new Date(createForm.endsAtUtc);
    const milliseconds = end.getTime() - start.getTime();

    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
      return null;
    }

    const hours = milliseconds / (1000 * 60 * 60);
    const days = hours / 24;

    if (Number.isInteger(days)) {
      return `${days} day${days === 1 ? "" : "s"}`;
    }

    return `${hours.toFixed(1)} hours`;
  }, [createForm.startsAtUtc, createForm.endsAtUtc]);

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

  const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

  const formatAppliesTo = (discount) => {
    if (!discount) return "-";

    const option = APPLIES_TO_TYPES.find(
      (item) => item.value === discount.appliesToType,
    );

    return option?.label || discount.appliesToType || "-";
  };

  const getRuleSummary = (discount) => {
    if (!discount) return "";
    if (discount.ruleSummary) return discount.ruleSummary;

    const rules = Array.isArray(discount.rules) ? discount.rules : [];

    return rules
      .map((rule) => `${rule.ruleType}: ${rule.ruleValue}`)
      .filter(Boolean)
      .join(discount.matchAllRules === false ? " OR " : " AND ");
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

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const dateOrNull = (value) => {
    if (!value) return null;
    return new Date(value).toISOString();
  };

  const loadReferenceData = () => {
    setReferenceLoading(true);

    Promise.all([
      catagoryService.getAllCatagories(),
      conditionService.getAllConditions(),
    ])
      .then(([categoryResponse, conditionResponse]) => {
        setCategories(categoryResponse?.item || []);
        setConditions(conditionResponse?.item || []);
      })
      .catch((err) => {
        showApiError(err, "Failed to load categories and conditions.");
      })
      .finally(() => setReferenceLoading(false));
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
      .finally(() => setLoading(false));
  };

  const loadDiscountById = (id) => {
    setDetailsLoading(true);

    return adminDiscountCodeService
      .getDiscountCodeById(id)
      .then((response) => {
        const discount = response?.item || null;
        setSelectedDiscount(discount);
        setDeactivateNotes("");
        return discount;
      })
      .catch((err) => {
        showApiError(err, "Failed to load discount details.");
        return null;
      })
      .finally(() => setDetailsLoading(false));
  };

  useEffect(() => {
    loadDiscounts(0);
    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetCreateForm = () => {
    setCreateForm(initialCreateForm);
    setSelectedPart(null);
    setPartResults([]);
    setPartSearch({ q: "", partNumber: "" });
  };

  const buildSuggestedBannerText = () => {
    const discountText =
      createForm.discountType === "Percentage"
        ? `${Number(createForm.discountValue || 0).toLocaleString()}%`
        : formatCurrency(createForm.discountValue || 0);

    const ruleWords = [];
    if (selectedCondition) ruleWords.push(selectedCondition.name || selectedCondition.label);
    if (selectedCategory) ruleWords.push(selectedCategory.name || selectedCategory.label);

    const target =
      createForm.appliesToType === "CollectionRule" && ruleWords.length > 0
        ? `all ${ruleWords.join(" ")} parts`
        : createForm.appliesToType === "General"
          ? "all products"
          : selectedPart?.name || "the selected item";

    const endText = createForm.endsAtUtc
      ? ` through ${new Date(createForm.endsAtUtc).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`
      : " while the sale is active";

    return {
      headline: createForm.title?.trim() || `${ruleWords.join(" ") || "Current"} Sale`,
      message: `Use code ${createForm.code.trim().toUpperCase() || "SALECODE"} for ${discountText} off ${target}${endText}.`,
      linkText: "Shop Sale",
      linkUrl: selectedCategory ? `/browse?categoryId=${selectedCategory.id}` : "/browse",
    };
  };

  const applySuggestedBannerText = () => {
    const suggested = buildSuggestedBannerText();
    setCreateForm((prev) => ({
      ...prev,
      bannerHeadline: suggested.headline,
      bannerMessage: suggested.message,
      bannerLinkText: suggested.linkText,
      bannerLinkUrl: suggested.linkUrl,
    }));
  };

  const onCreateFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setCreateForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "showSiteBanner" && checked && !prev.bannerMessage) {
        const suggested = buildSuggestedBannerText();
        next.bannerHeadline = suggested.headline;
        next.bannerMessage = suggested.message;
        next.bannerLinkText = suggested.linkText;
        next.bannerLinkUrl = suggested.linkUrl;
      }

      if (name === "appliesToType") {
        if (value !== "Part") {
          setSelectedPart(null);
          setPartResults([]);
          next.partId = "";
        }

        if (value !== "Product" && value !== "Part") {
          next.shopifyProductId = "";
        }

        if (value !== "Variant" && value !== "Part") {
          next.shopifyVariantId = "";
        }

        if (value !== "CollectionRule") {
          next.categoryId = "";
          next.conditionId = "";
          next.matchAllRules = true;
          next.autoMaintainEligibility = true;
        }
      }

      return next;
    });
  };

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
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
        "Shopify Product Id is required when Applies To is Shopify product.",
      );
      return false;
    }

    if (
      createForm.appliesToType === "Variant" &&
      !createForm.shopifyVariantId
    ) {
      toastr.warning(
        "Shopify Variant Id is required when Applies To is Shopify variant.",
      );
      return false;
    }

    if (
      createForm.appliesToType === "CollectionRule" &&
      !createForm.categoryId &&
      !createForm.conditionId
    ) {
      toastr.warning("Select at least one category or condition rule.");
      return false;
    }

    if (createForm.showSiteBanner && !createForm.bannerMessage.trim()) {
      toastr.warning("Enter a website banner message.");
      return false;
    }

    return true;
  };

  const buildCollectionRules = () => {
    const rules = [];

    if (selectedCategory) {
      rules.push({
        ruleType: "Category",
        sourceId: Number(selectedCategory.id),
        ruleValue: selectedCategory.name || selectedCategory.label,
        sortOrder: rules.length,
      });
    }

    if (selectedCondition) {
      rules.push({
        ruleType: "Condition",
        sourceId: Number(selectedCondition.id),
        ruleValue: selectedCondition.name || selectedCondition.label,
        sortOrder: rules.length,
      });
    }

    return rules;
  };

  const buildCreatePayload = () => {
    const isCollectionRule = createForm.appliesToType === "CollectionRule";

    return {
      code: createForm.code.trim().toUpperCase(),
      title: emptyToNull(createForm.title?.trim()),
      discountType: createForm.discountType,
      discountValue: Number(createForm.discountValue),
      appliesToType: createForm.appliesToType,
      partId:
        createForm.appliesToType === "Part"
          ? numberOrNull(createForm.partId)
          : null,
      shopifyProductId:
        createForm.appliesToType === "Product" ||
        createForm.appliesToType === "Part"
          ? numberOrNull(createForm.shopifyProductId)
          : null,
      shopifyVariantId:
        createForm.appliesToType === "Variant" ||
        createForm.appliesToType === "Part"
          ? numberOrNull(createForm.shopifyVariantId)
          : null,
      matchAllRules: isCollectionRule ? Boolean(createForm.matchAllRules) : true,
      autoMaintainEligibility: isCollectionRule,
      rules: isCollectionRule ? buildCollectionRules() : [],
      customerEmail: emptyToNull(createForm.customerEmail?.trim()),
      startsAtUtc: dateOrNull(createForm.startsAtUtc),
      endsAtUtc: dateOrNull(createForm.endsAtUtc),
      usageLimit: Number(createForm.usageLimit) || 1,
      oncePerCustomer: Boolean(createForm.oncePerCustomer),
      adminNotes: emptyToNull(createForm.adminNotes?.trim()),
      showSiteBanner: Boolean(createForm.showSiteBanner),
      bannerHeadline: createForm.showSiteBanner
        ? emptyToNull(createForm.bannerHeadline?.trim())
        : null,
      bannerMessage: createForm.showSiteBanner
        ? emptyToNull(createForm.bannerMessage?.trim())
        : null,
      bannerLinkText: createForm.showSiteBanner
        ? emptyToNull(createForm.bannerLinkText?.trim())
        : null,
      bannerLinkUrl: createForm.showSiteBanner
        ? emptyToNull(createForm.bannerLinkUrl?.trim())
        : null,
      bannerPriority: createForm.showSiteBanner
        ? Number(createForm.bannerPriority) || 0
        : 0,
    };
  };

  const onCreateDiscount = (e) => {
    e.preventDefault();

    if (!validateCreateForm()) return;

    setCreating(true);

    adminDiscountCodeService
      .addDiscountCode(buildCreatePayload())
      .then((response) => {
        const id = response?.item;
        resetCreateForm();
        loadDiscounts(0);

        if (!id) {
          toastr.success("Discount code record created.");
          return null;
        }

        return loadDiscountById(id).then((discount) => {
          if (discount?.status === "Error") {
            toastr.warning(
              "The local discount was saved, but Shopify reported an error. Review the details panel.",
            );
          } else if (discount?.appliesToType === "CollectionRule") {
            toastr.success(
              "Automated collection discount created and connected to Shopify.",
            );
          } else {
            toastr.success("Discount code created in Shopify.");
          }
        });
      })
      .catch((err) => showApiError(err, "Failed to create discount code."))
      .finally(() => setCreating(false));
  };

  const onSelectDiscount = (discount) => {
    if (discount?.id) loadDiscountById(discount.id);
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
      .catch((err) => showApiError(err, "Failed to deactivate discount code."))
      .finally(() => setDeactivating(false));
  };

  const onBackfillShopifyTags = () => {
    setBackfillLoading(true);
    setBackfillResult(null);

    adminDiscountCodeService
      .backfillShopifyTags()
      .then((response) => {
        const result = response?.item || null;
        setBackfillResult(result);

        if (result?.productsFailed > 0) {
          toastr.warning(
            `Tag backfill completed with ${result.productsFailed} failed product(s).`,
          );
        } else {
          toastr.success(
            `Shopify tags updated on ${result?.productsUpdated || 0} product(s).`,
          );
        }
      })
      .catch((err) => showApiError(err, "Failed to backfill Shopify tags."))
      .finally(() => setBackfillLoading(false));
  };

  const goPrev = () => {
    if (pageData.pageIndex > 0) loadDiscounts(pageData.pageIndex - 1);
  };

  const goNext = () => {
    if (pageData.pageIndex + 1 < pageData.totalPages) {
      loadDiscounts(pageData.pageIndex + 1);
    }
  };

  const getPartSearchResults = (response) => {
    const item = response?.item;
    if (Array.isArray(item)) return item;
    if (Array.isArray(item?.pagedItems)) return item.pagedItems;
    if (Array.isArray(item?.items)) return item.items;
    return [];
  };

  const getPartAdminNotes = (part) =>
    part?.adminNotes ||
    part?.AdminNotes ||
    part?.notes ||
    part?.adminNote ||
    "";

  const truncateText = (text, maxLength = 220) => {
    if (!text || text.length <= maxLength) return text || "";
    return `${text.substring(0, maxLength)}...`;
  };

  const getPartImageUrl = (part) => {
    const image = part?.image || part?.primaryImage || part?.imageUrl || part?.url;
    if (!image) return null;
    if (image.startsWith("http://") || image.startsWith("https://")) return image;

    const cleanImage = image.startsWith("/") ? image : `/${image}`;
    return `${API_HOST_PREFIX}${cleanImage}`;
  };

  const onPartImageError = (e) => {
    e.currentTarget.style.display = "none";
    const fallback = e.currentTarget
      .closest(".discounts-part-image-wrap")
      ?.querySelector(".discounts-part-image-fallback");

    if (fallback) fallback.style.display = "flex";
  };

  const onPartSearchChange = (e) => {
    const { name, value } = e.target;
    setPartSearch((prev) => ({ ...prev, [name]: value }));
  };

  const onSearchParts = () => {
    const q = partSearch.q?.trim();
    const partNumber = partSearch.partNumber?.trim();

    if (!q && !partNumber) {
      toastr.warning("Enter a part name, keyword, or part number.");
      return;
    }

    const params = { MaxRows: 25 };
    if (q) params.q = q;
    if (partNumber) params.PartNumber = partNumber;

    setPartSearchLoading(true);

    partsService
      .searchPart(params)
      .then((response) => {
        const results = getPartSearchResults(response);
        setPartResults(results);
        if (results.length === 0) toastr.info("No parts found.");
      })
      .catch((err) => showApiError(err, "Failed to search parts."))
      .finally(() => setPartSearchLoading(false));
  };

  const onUsePart = (part) => {
    const partAdminNotes = getPartAdminNotes(part);
    setSelectedPart(part);

    setCreateForm((prev) => ({
      ...prev,
      appliesToType: "Part",
      partId: part.id || "",
      shopifyProductId: part.shopifyProductId || "",
      shopifyVariantId: part.shopifyVariantId || "",
      adminNotes:
        !prev.adminNotes?.trim() && partAdminNotes
          ? `Part Admin Notes:\n${partAdminNotes}`
          : prev.adminNotes,
    }));

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
    if (Number.isNaN(numberValue)) return "-";

    return numberValue.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  };

  const renderPartCard = (part, selected = false) => (
    <div className={selected ? "selected-part-card" : "discounts-part-result"}>
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
          style={{ display: getPartImageUrl(part) ? "none" : "flex" }}
        >
          No Photo
        </div>
      </div>

      <div className="discounts-part-info">
        <strong>
          #{part.id} {part.name}
        </strong>
        <p>Part Number: {part.partNumber || part.partnumber || "-"}</p>
        <p>
          Price: {formatPartPrice(part.price)} | Status: {part.availableStatus || "-"}
        </p>

        {getPartAdminNotes(part) ? (
          <div className="discounts-part-admin-notes">
            <strong>Part Admin Notes</strong>
            <p>
              {selected
                ? getPartAdminNotes(part)
                : truncateText(getPartAdminNotes(part), 180)}
            </p>
          </div>
        ) : (
          <div className="discounts-part-admin-notes empty">
            <strong>Part Admin Notes</strong>
            <p>No admin notes on this part.</p>
          </div>
        )}
      </div>

      {selected ? (
        <span className="discount-status active">Selected</span>
      ) : (
        <button
          className="discounts-btn small primary"
          type="button"
          onClick={() => onUsePart(part)}
        >
          Use Part
        </button>
      )}
    </div>
  );

  return (
    <div className="discounts-page">
      <div className="discounts-header">
        <div>
          <h2>Admin Discounts</h2>
          <p>
            Create Shopify discount codes, including automatically maintained
            category and condition sales.
          </p>
        </div>

        <button
          className="discounts-btn secondary"
          type="button"
          onClick={onBackfillShopifyTags}
          disabled={backfillLoading}
        >
          {backfillLoading ? "Updating Shopify Tags..." : "Backfill Shopify Tags"}
        </button>
      </div>

      <div className="discounts-tag-help">
        <strong>Automated collection setup</strong>
        <p>
          Run the tag backfill once after deploying this feature. Future part
          publishes and Shopify syncs will keep managed category and condition
          tags current automatically.
        </p>
        {backfillResult ? (
          <div className="discounts-backfill-result">
            <span>Examined: {backfillResult.partsExamined || 0}</span>
            <span>Updated: {backfillResult.productsUpdated || 0}</span>
            <span>Skipped: {backfillResult.productsSkipped || 0}</span>
            <span>Failed: {backfillResult.productsFailed || 0}</span>
          </div>
        ) : null}
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
              placeholder="USEDENGINE10"
            />
          </div>

          <div className="discounts-field">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={createForm.title}
              onChange={onCreateFormChange}
              placeholder="10% Off Used Engine Parts"
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
                <option key={type.value} value={type.value}>
                  {type.label}
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
                createForm.discountType === "Percentage" ? "10" : "25.00"
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
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {createForm.appliesToType === "Product" ? (
            <div className="discounts-field">
              <label>Shopify Product Id</label>
              <input
                type="text"
                inputMode="numeric"
                name="shopifyProductId"
                value={createForm.shopifyProductId}
                onChange={onCreateFormChange}
                placeholder="Required"
              />
            </div>
          ) : null}

          {createForm.appliesToType === "Variant" ? (
            <div className="discounts-field">
              <label>Shopify Variant Id</label>
              <input
                type="text"
                inputMode="numeric"
                name="shopifyVariantId"
                value={createForm.shopifyVariantId}
                onChange={onCreateFormChange}
                placeholder="Required"
              />
            </div>
          ) : null}

          {createForm.appliesToType === "Part" ? (
            <>
              <div className="discounts-field">
                <label>Selected Part Id</label>
                <input
                  type="text"
                  inputMode="numeric"
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
                  type="text"
                  inputMode="numeric"
                  name="shopifyProductId"
                  value={createForm.shopifyProductId}
                  onChange={onCreateFormChange}
                  placeholder="Filled from selected part"
                />
              </div>

              <div className="discounts-field">
                <label>Shopify Variant Id</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="shopifyVariantId"
                  value={createForm.shopifyVariantId}
                  onChange={onCreateFormChange}
                  placeholder="Filled from selected part"
                />
              </div>
            </>
          ) : null}

          {createForm.appliesToType === "CollectionRule" ? (
            <div className="discounts-rule-builder full-width">
              <div className="discounts-rule-builder-header">
                <div>
                  <h4>Automated Collection Rules</h4>
                  <p>
                    Shopify will automatically add or remove products as their
                    Site category or condition tags change.
                  </p>
                </div>
                <span className="discount-status active">Automatic</span>
              </div>

              <div className="discounts-rule-fields">
                <div className="discounts-field">
                  <label>Category</label>
                  <select
                    name="categoryId"
                    value={createForm.categoryId}
                    onChange={onCreateFormChange}
                    disabled={referenceLoading}
                  >
                    <option value="">Any category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="discounts-field">
                  <label>Condition</label>
                  <select
                    name="conditionId"
                    value={createForm.conditionId}
                    onChange={onCreateFormChange}
                    disabled={referenceLoading}
                  >
                    <option value="">Any condition</option>
                    {conditions.map((condition) => (
                      <option key={condition.id} value={condition.id}>
                        {condition.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="discounts-field checkbox-field rule-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="matchAllRules"
                      checked={createForm.matchAllRules}
                      onChange={onCreateFormChange}
                      disabled={collectionRulePreview.length < 2}
                    />
                    Require every selected rule (AND)
                  </label>
                </div>
              </div>

              <div className="discounts-rule-summary">
                <strong>Rule preview</strong>
                {collectionRulePreview.length > 0 ? (
                  <p>
                    {collectionRulePreview.join(
                      createForm.matchAllRules ? " AND " : " OR ",
                    )}
                  </p>
                ) : (
                  <p>Select a category, a condition, or both.</p>
                )}
                <small>
                  Automatic maintenance is always enabled for collection rules.
                </small>
              </div>
            </div>
          ) : null}

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
            {saleDuration ? (
              <small className="discounts-field-help">Duration: {saleDuration}</small>
            ) : null}
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

          <div className="discounts-banner-builder full-width">
            <div className="discounts-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  name="showSiteBanner"
                  checked={createForm.showSiteBanner}
                  onChange={onCreateFormChange}
                />
                Display this sale in the customer website banner
              </label>
            </div>

            {createForm.showSiteBanner ? (
              <>
                <div className="discounts-banner-fields">
                  <div className="discounts-field">
                    <label>Banner Headline</label>
                    <input name="bannerHeadline" value={createForm.bannerHeadline} onChange={onCreateFormChange} placeholder="Used Engine Sale" />
                  </div>
                  <div className="discounts-field">
                    <label>Priority</label>
                    <input type="number" min="0" name="bannerPriority" value={createForm.bannerPriority} onChange={onCreateFormChange} />
                  </div>
                  <div className="discounts-field full-width">
                    <label>Banner Message</label>
                    <textarea name="bannerMessage" rows="3" value={createForm.bannerMessage} onChange={onCreateFormChange} placeholder="Use code ENGINEJUNE26 for 10% off all Used Engine parts through June 30." />
                  </div>
                  <div className="discounts-field">
                    <label>Link Text</label>
                    <input name="bannerLinkText" value={createForm.bannerLinkText} onChange={onCreateFormChange} placeholder="Shop Sale" />
                  </div>
                  <div className="discounts-field">
                    <label>Link URL</label>
                    <input name="bannerLinkUrl" value={createForm.bannerLinkUrl} onChange={onCreateFormChange} placeholder="/browse?categoryId=12" />
                  </div>
                </div>
                <div className="discounts-banner-preview">
                  <div>
                    <strong>{createForm.bannerHeadline || "Sale"}</strong>
                    <span>{createForm.bannerMessage || "Banner message preview"}</span>
                  </div>
                  <button className="discounts-btn secondary small" type="button" onClick={applySuggestedBannerText}>Use Suggested Text</button>
                </div>
              </>
            ) : null}
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

          {createForm.appliesToType === "CollectionRule" &&
          collectionRulePreview.length > 0 ? (
            <div className="discounts-create-summary full-width">
              <strong>{formatDiscountValue(createForm)} off</strong>
              <span>
                {collectionRulePreview.join(
                  createForm.matchAllRules ? " + " : " or ",
                )}
              </span>
              <span>
                {saleDuration ? `Duration: ${saleDuration}` : "No duration calculated"}
              </span>
              <span>Shopify collection membership: automatic</span>
            </div>
          ) : null}

          {createForm.appliesToType === "Part" ? (
            <div className="discounts-part-search full-width">
              <div className="discounts-part-search-header">
                <div>
                  <h4>Find Part</h4>
                  <p>
                    Search and attach a Site part. Results include its photo and
                    admin notes for confirmation.
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

              {selectedPart ? renderPartCard(selectedPart, true) : null}

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
                    <React.Fragment key={part.id}>
                      {renderPartCard(part)}
                    </React.Fragment>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="discounts-actions full-width">
            <button
              className="discounts-btn primary"
              type="submit"
              disabled={creating || referenceLoading}
            >
              {creating ? "Creating..." : "Create Discount"}
            </button>

            <button
              className="discounts-btn secondary"
              type="button"
              onClick={resetCreateForm}
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
          <select name="status" value={filters.status} onChange={onFilterChange}>
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
          <button className="discounts-btn primary" type="submit" disabled={loading}>
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
            <div className="discounts-table-scroll">
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
                        {formatAppliesTo(discount)}
                        {discount.partId ? (
                          <div className="discounts-muted">Part #{discount.partId}</div>
                        ) : null}
                        {discount.appliesToType === "CollectionRule" ? (
                          <div className="discounts-muted discounts-rule-table-summary">
                            {getRuleSummary(discount) || `${discount.ruleCount || 0} rule(s)`}
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
            </div>
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
                  <p>{formatAppliesTo(selectedDiscount)}</p>
                </div>

                <div>
                  <strong>Usage</strong>
                  <p>
                    {selectedDiscount.usageCount}/{selectedDiscount.usageLimit}
                  </p>
                </div>

                {selectedDiscount.appliesToType === "CollectionRule" ? (
                  <>
                    <div>
                      <strong>Rule Matching</strong>
                      <p>{selectedDiscount.matchAllRules ? "Match all (AND)" : "Match any (OR)"}</p>
                    </div>

                    <div>
                      <strong>Automatic Maintenance</strong>
                      <p>{selectedDiscount.autoMaintainEligibility ? "Enabled" : "Not marked"}</p>
                    </div>

                    <div className="full-width">
                      <strong>Collection Rules</strong>
                      {Array.isArray(selectedDiscount.rules) &&
                      selectedDiscount.rules.length > 0 ? (
                        <div className="discounts-detail-rules">
                          {selectedDiscount.rules.map((rule) => (
                            <div className="discounts-detail-rule" key={rule.id}>
                              <span>{rule.ruleType}</span>
                              <strong>{rule.ruleValue}</strong>
                              <code>{rule.shopifyTag}</code>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>{getRuleSummary(selectedDiscount) || "-"}</p>
                      )}
                    </div>

                    <div>
                      <strong>Collection Sync</strong>
                      <p>
                        <span
                          className={`discount-sync-status ${String(
                            selectedDiscount.lastCollectionSyncStatus || "unknown",
                          ).toLowerCase()}`}
                        >
                          {selectedDiscount.lastCollectionSyncStatus || "Unknown"}
                        </span>
                      </p>
                    </div>

                    <div>
                      <strong>Last Collection Sync</strong>
                      <p>{formatDate(selectedDiscount.lastCollectionSyncUtc)}</p>
                    </div>

                    <div className="full-width">
                      <strong>Shopify Collection GID</strong>
                      <p className="break-text">
                        {selectedDiscount.shopifyCollectionGid || "-"}
                      </p>
                    </div>

                    <div className="full-width">
                      <strong>Shopify Collection Handle</strong>
                      <p className="break-text">
                        {selectedDiscount.shopifyCollectionHandle || "-"}
                      </p>
                    </div>

                    {selectedDiscount.lastCollectionSyncError ? (
                      <div className="full-width discounts-sync-error">
                        <strong>Collection Sync Error</strong>
                        <p className="break-text">
                          {selectedDiscount.lastCollectionSyncError}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div>
                  <strong>Part</strong>
                  <p>
                    {selectedDiscount.partId
                      ? `#${selectedDiscount.partId} ${selectedDiscount.partName || ""}`
                      : "-"}
                  </p>
                </div>

                <div>
                  <strong>Customer Email</strong>
                  <p>{selectedDiscount.customerEmail || "-"}</p>
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

                <div>
                  <strong>Website Banner</strong>
                  <p>{selectedDiscount.showSiteBanner ? "Enabled" : "Disabled"}</p>
                </div>

                <div>
                  <strong>Banner Priority</strong>
                  <p>{selectedDiscount.bannerPriority ?? 0}</p>
                </div>

                {selectedDiscount.showSiteBanner ? (
                  <>
                    <div className="full-width">
                      <strong>Banner Headline</strong>
                      <p>{selectedDiscount.bannerHeadline || "-"}</p>
                    </div>
                    <div className="full-width">
                      <strong>Banner Message</strong>
                      <p className="break-text">{selectedDiscount.bannerMessage || "-"}</p>
                    </div>
                    <div>
                      <strong>Banner Link Text</strong>
                      <p>{selectedDiscount.bannerLinkText || "-"}</p>
                    </div>
                    <div>
                      <strong>Banner Link URL</strong>
                      <p className="break-text">{selectedDiscount.bannerLinkUrl || "-"}</p>
                    </div>
                  </>
                ) : null}

                <div className="full-width">
                  <strong>Admin Notes</strong>
                  <p className="break-text">{selectedDiscount.adminNotes || "-"}</p>
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
