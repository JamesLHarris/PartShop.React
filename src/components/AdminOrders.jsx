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
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
};

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.errors?.[0] ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;

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
    [activeView]
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError("");

    shopifyOrderService
      .getRecent(activeView, 25)
      .then((response) => {
        if (!isMounted) return;
        setOrders(response.item || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(getErrorMessage(err, "Unable to load Shopify orders."));
        setOrders([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeView, refreshKey]);

  const toggleExpand = (orderId) => {
    setExpandedId((cur) => (cur === orderId ? null : orderId));
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
        const result = response.item;
        setSyncDetails(result);
        setSyncMessage(
          `Sync complete: ${result?.partsMarkedSold || 0} part(s) marked sold, ${
            result?.alreadySyncedCount || 0
          } already synced, ${result?.skippedCount || 0} skipped.`
        );
        refresh();
      })
      .catch((err) => {
        setError(getErrorMessage(err, "Unable to sync Shopify orders."));
      })
      .finally(() => {
        setIsSyncing(false);
      });
  };

  return (
    <div className="Order-Wrapper">
      <div className="Orders-Header">
        <div>
          <h2>Shopify Orders</h2>
          <p>
            Customer/order details are pulled live from Shopify. Site_2024 only
            uses Shopify IDs to match sold parts and pick locations.
          </p>
        </div>
        <div className="Orders-HeaderActions">
          <button className="btn-sm secondary" onClick={refresh} disabled={isLoading || isSyncing}>
            {isLoading ? "Loading..." : "Refresh"}
          </button>
          <button className="btn-sm" onClick={syncPaidOrders} disabled={isLoading || isSyncing}>
            {isSyncing ? "Syncing..." : "Sync Paid Orders"}
          </button>
        </div>
      </div>

      {syncMessage && <div className="Orders-Success">{syncMessage}</div>}

      {syncDetails?.items?.length > 0 && (
        <div className="SyncSummary">
          <strong>Last sync</strong>
          <ul>
            {syncDetails.items.slice(0, 8).map((item, index) => (
              <li key={`${item.shopifyOrderId}-${item.shopifyLineItemId}-${index}`}>
                {item.orderName}: {item.partId ? `Part #${item.partId}` : "No local part"} — {item.message}
              </li>
            ))}
          </ul>
          {syncDetails.items.length > 8 && (
            <div className="DetailsSubtle">Showing first 8 of {syncDetails.items.length} sync rows.</div>
          )}
        </div>
      )}

      <div className="Orders-Selector">
        {TABS.map((tab) => (
          <button
            key={tab.view}
            className={tab.view === activeView ? "is-active" : ""}
            onClick={() => {
              setActiveView(tab.view);
              setExpandedId(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="Orders-Container">
        {error && <div className="Orders-Error">{error}</div>}

        {!error && isLoading && <div className="Orders-Empty">Loading {activeTab.label}...</div>}

        {!error && !isLoading && orders.length === 0 && (
          <div className="Orders-Empty">No Shopify orders found for {activeTab.label}.</div>
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
                <th>Payment</th>
                <th>Fulfillment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isOpen = expandedId === order.shopifyOrderId;
                const itemCount = order.lineItems?.reduce(
                  (sum, item) => sum + (item.quantity || 0),
                  0
                );

                return (
                  <React.Fragment key={order.shopifyOrderId}>
                    <tr className={isOpen ? "row-open" : ""}>
                      <td>{order.name || `#${order.orderNumber}`}</td>
                      <td>{order.customerDisplayName || order.customerEmail || "Shopify Customer"}</td>
                      <td>{itemCount}</td>
                      <td>{money(order.totalPrice, order.currencyCode)}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <span className="badge">{order.displayFinancialStatus || "Unknown"}</span>
                      </td>
                      <td>
                        <span className="badge">{order.displayFulfillmentStatus || "Unknown"}</span>
                      </td>
                      <td>
                        <button className="btn-sm" onClick={() => toggleExpand(order.shopifyOrderId)}>
                          {isOpen ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="Order-Details">
                        <td colSpan={8}>
                          <div className="DetailsCard">
                            <div className="DetailsHeader">
                              <div>
                                <strong>{order.name}</strong>
                                <span className="DetailsSubtle"> Shopify ID: {order.shopifyOrderId}</span>
                              </div>
                              <div className="DetailsMeta">
                                {itemCount} item(s) • {money(order.totalPrice, order.currencyCode)}
                              </div>
                            </div>

                            <table className="PickListTable">
                              <thead>
                                <tr>
                                  <th>Photo</th>
                                  <th>SKU</th>
                                  <th>Shopify Item</th>
                                  <th>Local Part</th>
                                  <th>Qty</th>
                                  <th>Status</th>
                                  <th>Location</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(order.lineItems || []).map((item) => {
                                  const local = item.localPart;
                                  const imageUrl = local?.imageUrl || item.shopifyImageUrl;

                                  return (
                                    <tr key={item.shopifyLineItemId || item.shopifyLineItemGid}>
                                      <td className="ImageCell">
                                        {imageUrl ? (
                                          <img
                                            className="thumb"
                                            src={imageUrl}
                                            alt={item.title}
                                            loading="lazy"
                                            onClick={() => setPreview({ src: imageUrl, alt: item.title })}
                                          />
                                        ) : (
                                          <div className="thumb thumb-empty">No Photo</div>
                                        )}
                                      </td>
                                      <td className="mono">{item.sku || "—"}</td>
                                      <td>
                                        <div>{item.title}</div>
                                        <div className="DetailsSubtle">
                                          Variant: {item.shopifyVariantId || "not found"}
                                        </div>
                                      </td>
                                      <td>
                                        {local ? (
                                          <a
                                            href={`/admin/part/${local.partId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            #{local.partId} {local.partName || local.partNumber}
                                          </a>
                                        ) : (
                                          <span className="Orders-Warning">No local match</span>
                                        )}
                                      </td>
                                      <td>{item.quantity}</td>
                                      <td>
                                        {local ? (
                                          <span className="badge">{local.availableStatus || "Unknown"}</span>
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                      <td className="mono">{local?.locationCode || "—"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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
      </div>

      {preview && (
        <div className="Lightbox" onClick={() => setPreview(null)}>
          <img src={preview.src} alt={preview.alt} />
        </div>
      )}

      <Outlet />
    </div>
  );
}
