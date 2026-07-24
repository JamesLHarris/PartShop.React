import React, { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import shopifyOrderService from "../service/shopifyOrderService";
import "./AdminOrders.css";

const TABS = [
  { label: "Awaiting Shipment", view: "awaitingShipment" },
  { label: "Fulfilled", view: "fulfilled" },
  { label: "All Recent", view: "all" },
];

const money = (amount, currencyCode) => {
  const value = Number(amount || 0);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errors?.[0] ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const uniqueUrls = (urls) =>
  Array.from(
    new Set(
      (urls || [])
        .map((url) => String(url || "").trim())
        .filter(Boolean),
    ),
  );

const getItemImages = (item) => {
  const localImages = uniqueUrls([
    ...(item?.localPart?.imageUrls || []),
    item?.localPart?.imageUrl,
  ]);

  if (localImages.length > 0) {
    return {
      urls: localImages,
      source: "Site API",
    };
  }

  const shopifyImages = uniqueUrls([item?.shopifyImageUrl]);

  return {
    urls: shopifyImages,
    source: shopifyImages.length > 0 ? "Shopify" : "",
  };
};

export default function AdminOrders() {
  const [activeView, setActiveView] = useState("awaitingShipment");
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncDetails, setSyncDetails] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeTab = useMemo(
    () => TABS.find((tab) => tab.view === activeView) || TABS[0],
    [activeView],
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError("");

    shopifyOrderService
      .getRecent(activeView, 25)
      .then((response) => {
        if (!isMounted) return;
        setOrders(response?.item || []);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(
          getErrorMessage(
            loadError,
            "Unable to load Shopify orders.",
          ),
        );
        setOrders([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeView, refreshKey]);

  useEffect(() => {
    if (!preview) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreview(null);
      }

      if (event.key === "ArrowLeft") {
        setPreview((current) => {
          if (!current || current.images.length <= 1) {
            return current;
          }

          return {
            ...current,
            index:
              (current.index - 1 + current.images.length) %
              current.images.length,
          };
        });
      }

      if (event.key === "ArrowRight") {
        setPreview((current) => {
          if (!current || current.images.length <= 1) {
            return current;
          }

          return {
            ...current,
            index: (current.index + 1) % current.images.length,
          };
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [preview]);

  const toggleExpand = (orderId) => {
    setExpandedId((current) =>
      current === orderId ? null : orderId,
    );
  };

  const refresh = () => {
    setExpandedId(null);
    setRefreshKey((current) => current + 1);
  };

  const syncPaidOrders = () => {
    setIsSyncing(true);
    setSyncMessage("");
    setSyncDetails(null);
    setError("");

    shopifyOrderService
      .syncRecentPaid(25)
      .then((response) => {
        const result = response?.item;

        setSyncDetails(result);
        setSyncMessage(
          `Sync complete: ${
            result?.partsMarkedSold || 0
          } part(s) marked sold, ${
            result?.alreadySyncedCount || 0
          } already synced, ${
            result?.skippedCount || 0
          } skipped.`,
        );

        refresh();
      })
      .catch((syncError) => {
        setError(
          getErrorMessage(
            syncError,
            "Unable to sync Shopify orders.",
          ),
        );
      })
      .finally(() => {
        setIsSyncing(false);
      });
  };

  const openPreview = (images, alt, index = 0) => {
    if (!images?.length) {
      return;
    }

    setPreview({
      images,
      alt,
      index: Math.max(0, Math.min(index, images.length - 1)),
    });
  };

  const movePreview = (direction) => {
    setPreview((current) => {
      if (!current || current.images.length <= 1) {
        return current;
      }

      return {
        ...current,
        index:
          (current.index + direction + current.images.length) %
          current.images.length,
      };
    });
  };

  return (
    <main className="Order-Wrapper">
      <header className="Orders-Header">
        <div>
          <p className="Orders-Eyebrow">Administration</p>
          <h1>Shopify Orders</h1>
          <p>
            Orders are pulled live from Shopify. Item photos and warehouse
            locations are matched from the Site_2024 API.
          </p>
        </div>

        <div className="Orders-HeaderActions">
          <button
            type="button"
            className="btn-sm secondary"
            onClick={refresh}
            disabled={isLoading || isSyncing}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>

          <button
            type="button"
            className="btn-sm"
            onClick={syncPaidOrders}
            disabled={isLoading || isSyncing}
          >
            {isSyncing ? "Syncing..." : "Sync Paid Orders"}
          </button>
        </div>
      </header>

      {syncMessage && (
        <div className="Orders-Success">{syncMessage}</div>
      )}

      {syncDetails?.items?.length > 0 && (
        <section className="SyncSummary">
          <strong>Last sync</strong>
          <ul>
            {syncDetails.items.slice(0, 8).map((item, index) => (
              <li
                key={`${item.shopifyOrderId}-${item.shopifyLineItemId}-${index}`}
              >
                {item.orderName}:{" "}
                {item.partId
                  ? `Part #${item.partId}`
                  : "No local part"}{" "}
                — {item.message}
              </li>
            ))}
          </ul>

          {syncDetails.items.length > 8 && (
            <div className="DetailsSubtle">
              Showing first 8 of {syncDetails.items.length} sync rows.
            </div>
          )}
        </section>
      )}

      <nav className="Orders-Selector" aria-label="Order views">
        {TABS.map((tab) => (
          <button
            key={tab.view}
            type="button"
            className={tab.view === activeView ? "is-active" : ""}
            onClick={() => {
              setActiveView(tab.view);
              setExpandedId(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="Orders-Container">
        {error && <div className="Orders-Error">{error}</div>}

        {!error && isLoading && (
          <div className="Orders-Empty">
            Loading {activeTab.label}...
          </div>
        )}

        {!error && !isLoading && orders.length === 0 && (
          <div className="Orders-Empty">
            No Shopify orders found for {activeTab.label}.
          </div>
        )}

        {!error && orders.length > 0 && (
          <table className="Orders-Table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Created</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const isOpen =
                  expandedId === order.shopifyOrderId;

                const itemCount = order.lineItems?.reduce(
                  (sum, item) => sum + (item.quantity || 0),
                  0,
                );

                return (
                  <React.Fragment key={order.shopifyOrderId}>
                    <tr className={isOpen ? "row-open" : ""}>
                      <td>
                        {order.name || `#${order.orderNumber}`}
                      </td>
                      <td>
                        {order.customerDisplayName ||
                          order.customerEmail ||
                          "Shopify Customer"}
                      </td>
                      <td>{itemCount}</td>
                      <td>
                        {money(
                          order.totalPrice,
                          order.currencyCode,
                        )}
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td className="Orders-ActionCell">
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() =>
                            toggleExpand(order.shopifyOrderId)
                          }
                        >
                          {isOpen ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="Order-Details">
                        <td colSpan={6}>
                          <div className="DetailsCard">
                            <div className="DetailsHeader">
                              <div>
                                <strong>{order.name}</strong>
                                <span className="DetailsSubtle">
                                  {" "}
                                  Shopify ID: {order.shopifyOrderId}
                                </span>
                              </div>

                              <div className="DetailsMeta">
                                {itemCount} item(s) •{" "}
                                {money(
                                  order.totalPrice,
                                  order.currencyCode,
                                )}
                              </div>
                            </div>

                            <div className="PickListScroll">
                              <table className="PickListTable">
                                <thead>
                                  <tr>
                                    <th>Photo</th>
                                    <th>SKU</th>
                                    <th>Shopify Item</th>
                                    <th>Local Part</th>
                                    <th>Qty</th>
                                    <th>Location</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {(order.lineItems || []).map(
                                    (item) => {
                                      const local = item.localPart;
                                      const imageInfo =
                                        getItemImages(item);
                                      const imageUrl =
                                        imageInfo.urls[0];

                                      return (
                                        <tr
                                          key={
                                            item.shopifyLineItemId ||
                                            item.shopifyLineItemGid
                                          }
                                        >
                                          <td className="ImageCell">
                                            {imageUrl ? (
                                              <div className="OrderPhoto">
                                                <button
                                                  type="button"
                                                  className="OrderPhoto__button"
                                                  onClick={() =>
                                                    openPreview(
                                                      imageInfo.urls,
                                                      item.title,
                                                    )
                                                  }
                                                  aria-label={`View ${item.title} photos`}
                                                >
                                                  <img
                                                    className="thumb"
                                                    src={imageUrl}
                                                    alt={item.title}
                                                    loading="lazy"
                                                  />

                                                  {imageInfo.urls.length >
                                                    1 && (
                                                    <span className="OrderPhoto__count">
                                                      +
                                                      {imageInfo.urls
                                                        .length - 1}
                                                    </span>
                                                  )}
                                                </button>

                                                <span className="OrderPhoto__source">
                                                  {imageInfo.source}
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="thumb thumb-empty">
                                                No Photo
                                              </div>
                                            )}
                                          </td>

                                          <td className="mono">
                                            {item.sku || "—"}
                                          </td>

                                          <td>
                                            <div>{item.title}</div>
                                            <div className="DetailsSubtle">
                                              Variant:{" "}
                                              {item.shopifyVariantId ||
                                                "not found"}
                                            </div>
                                          </td>

                                          <td>
                                            {local ? (
                                              <a
                                                href={`/admin/part/${local.partId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                #{local.partId}{" "}
                                                {local.partName ||
                                                  local.partNumber}
                                              </a>
                                            ) : (
                                              <span className="Orders-Warning">
                                                No local match
                                              </span>
                                            )}
                                          </td>

                                          <td>{item.quantity}</td>

                                          <td className="mono LocationCell">
                                            {local?.locationCode || "—"}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {preview && (
        <div
          className="Lightbox"
          onClick={() => setPreview(null)}
          role="presentation"
        >
          <div
            className="Lightbox__dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${preview.alt} photo preview`}
          >
            <button
              type="button"
              className="Lightbox__close"
              onClick={() => setPreview(null)}
              aria-label="Close photo preview"
            >
              ×
            </button>

            {preview.images.length > 1 && (
              <button
                type="button"
                className="Lightbox__nav Lightbox__nav--previous"
                onClick={() => movePreview(-1)}
                aria-label="Previous photo"
              >
                ‹
              </button>
            )}

            <img
              src={preview.images[preview.index]}
              alt={`${preview.alt} ${preview.index + 1}`}
            />

            {preview.images.length > 1 && (
              <button
                type="button"
                className="Lightbox__nav Lightbox__nav--next"
                onClick={() => movePreview(1)}
                aria-label="Next photo"
              >
                ›
              </button>
            )}

            <div className="Lightbox__caption">
              {preview.index + 1} of {preview.images.length}
            </div>
          </div>
        </div>
      )}

      <Outlet />
    </main>
  );
}
