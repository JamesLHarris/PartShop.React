import React, { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import "./AdminOrders.css";

const TABS = ["Awaiting Shipment", "In Transit", "Delivered"];

// ------- Mock Data with images --------
const makeMockData = () => {
  const customers = [
    "Ana Vega",
    "Chris Park",
    "Leo Zhang",
    "Rita Patel",
    "Marcus Hill",
    "Ella Nguyen",
    "Jordan Cole",
    "Priya Shah",
    "Noah Kim",
    "Sara Lopez",
    "Derek Chu",
    "Maya Reed",
  ];

  const orders = [];
  const itemsByOrder = {};
  let id = 1001;

  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const mkLoc = (i) => {
    const site = 1 + (i % 2);
    const area = String.fromCharCode(65 + (i % 4)); // A–D
    const aisle = pad((i % 12) + 1);
    const shelf = pad((i % 20) + 1);
    const section = pad((i % 20) + 1);
    const bin = pad((i % 10) + 1);
    return {
      site,
      area,
      aisle,
      shelf,
      section,
      bin,
      code: `S${site}-A${area}-AL${aisle}-SH${shelf}--SE${section}-BX${bin}`,
    };
  };

  for (let i = 0; i < 24; i++) {
    const status =
      i < 8 ? "Awaiting Shipment" : i < 16 ? "In Transit" : "Delivered";
    const orderId = id++;
    orders.push({
      id: orderId,
      customer: customers[i % customers.length],
      items: (i % 4) + 1,
      total: (85 + (i % 7) * 42.5).toFixed(2),
      createdAt: new Date(Date.now() - i * 36 * 60 * 60 * 1000).toISOString(),
      status,
    });

    // 2–5 line items per order
    const lineCount = 2 + (i % 4);
    itemsByOrder[orderId] = Array.from({ length: lineCount }, (_, k) => {
      const idx = i * 5 + k;
      const loc = mkLoc(idx);
      // Deterministic placeholder images; swap to your real base later
      const img = `https://picsum.photos/seed/${orderId}-${k}/320/320`;
      return {
        lineId: `${orderId}-${k + 1}`,
        partId: 5000 + idx,
        sku: `PS-${pad(idx, 4)}`,
        name: [
          "Alternator",
          "Door Handle",
          "Headlight",
          "Radiator",
          "Brake Pad",
        ][idx % 5],
        qty: 1 + (idx % 3),
        imageUrl: img,
        location: loc,
        locationCode: loc.code,
      };
    });
  }

  return { orders, itemsByOrder };
};

export default function AdminOrders() {
  const [{ orders, itemsByOrder }] = useState(makeMockData);
  const [active, setActive] = useState("Awaiting Shipment");
  const [expandedId, setExpandedId] = useState(null);
  const [preview, setPreview] = useState(null); // {src, alt}

  const filtered = useMemo(
    () => orders.filter((o) => o.status === active),
    [orders, active]
  );

  const toggleExpand = (orderId) =>
    setExpandedId((cur) => (cur === orderId ? null : orderId));

  return (
    <div className="Order-Wrapper">
      <div className="Orders-Selector">
        {TABS.map((t) => (
          <button
            key={t}
            className={t === active ? "is-active" : ""}
            onClick={() => {
              setActive(t);
              setExpandedId(null);
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="Orders-Container">
        <table className="Orders-Table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Created</th>
              <th>Status</th>
              <th>Pick Loc.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const isOpen = expandedId === o.id;
              return (
                <React.Fragment key={o.id}>
                  <tr className={isOpen ? "row-open" : ""}>
                    <td>#{o.id}</td>
                    <td>{o.customer}</td>
                    <td>{o.items}</td>
                    <td>${o.total}</td>
                    <td>{new Date(o.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${o.status.toLowerCase()}`}>
                        {o.status}
                      </span>
                    </td>
                    <td></td>
                    <td>
                      <button
                        className="btn-sm"
                        onClick={() => toggleExpand(o.id)}
                      >
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
                              <strong>Order #{o.id}</strong> — {o.customer}
                            </div>
                            <div className="DetailsMeta">
                              {o.items} item(s) • ${o.total}
                            </div>
                          </div>

                          <table className="PickListTable">
                            <thead>
                              <tr>
                                <th>Photo</th>
                                <th>SKU</th>
                                <th>Part</th>
                                <th>Qty</th>
                                <th>Location</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(itemsByOrder[o.id] || []).map((it) => (
                                <tr key={it.lineId}>
                                  <td className="ImageCell">
                                    <img
                                      className="thumb"
                                      src={it.imageUrl}
                                      alt={it.name}
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "https://via.placeholder.com/160?text=Part";
                                      }}
                                      onClick={() =>
                                        setPreview({
                                          src: it.imageUrl,
                                          alt: it.name,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="mono">{it.sku}</td>
                                  <td>{it.name}</td>
                                  <td>{it.qty}</td>
                                  <td className="mono">{it.locationCode}</td>
                                  <td>
                                    <button className="btn-xs">
                                      Mark Picked
                                    </button>
                                  </td>
                                </tr>
                              ))}
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
      </div>

      {/* Simple image preview lightbox */}
      {preview && (
        <div className="Lightbox" onClick={() => setPreview(null)}>
          <img src={preview.src} alt={preview.alt} />
        </div>
      )}

      <Outlet />
    </div>
  );
}
