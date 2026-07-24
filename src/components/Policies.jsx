import React from "react";
import { Link } from "react-router-dom";
import "./Policies.css";

function Policies() {
  return (
    <main className="policies-page">
      <header className="policies-hero">
        <p className="policies-eyebrow">GR &amp; Sons (dporschepartsman)</p>
        <h1>Purchasing and Return Policies</h1>
        <p>
          Please review these policies before purchasing. Product condition,
          return eligibility, and proof requirements vary by item.
        </p>
      </header>

      <section className="policies-grid" aria-label="Store policies">
        <article className="policy-card">
          <h2>Before You Purchase</h2>
          <ul>
            <li>Review the item name, description, condition, photos, part number, and compatibility information.</li>
            <li>Contact GR &amp; Sons before checkout when you need clarification about a listing.</li>
            <li>Availability is limited to the quantity shown for the listing.</li>
          </ul>
        </article>

        <article className="policy-card policy-card--new">
          <h2>New Parts</h2>
          <ul>
            <li>New parts may be considered for return within 30 days of delivery.</li>
            <li>All returns require approval before the item is sent back.</li>
            <li>The returned part is inspected before the refund is finalized.</li>
            <li>Deductions may apply when the returned item is altered, incomplete, or damaged.</li>
          </ul>
        </article>

        <article className="policy-card policy-card--used">
          <h2>Used Parts</h2>
          <ul>
            <li>Used parts may be considered for return within 30 days of delivery.</li>
            <li>Normal signs of prior use, age, and cosmetic wear should be expected.</li>
            <li>All returns require approval and inspection.</li>
            <li>Deductions may apply when the returned condition differs from the condition at shipment.</li>
          </ul>
        </article>

        <article className="policy-card policy-card--not-working">
          <h2>Parts / Not Working</h2>
          <ul>
            <li>Items listed as Parts / Not Working are sold as-is.</li>
            <li>These items are intended for parts, repair, rebuilding, or other non-standard use.</li>
            <li>Parts / Not Working items are not eligible for return.</li>
          </ul>
        </article>

        <article className="policy-card">
          <h2>Return Requests and Proof</h2>
          <ul>
            <li>Return requests are reviewed manually and are not approved automatically.</li>
            <li>Changed-mind or no-longer-wanted requests do not require a defect description.</li>
            <li>Defective or not-as-described requests require a written explanation and supporting photos.</li>
            <li>Do not ship an item back until the return request has been approved.</li>
          </ul>
        </article>

        <article className="policy-card">
          <h2>Shipping, Inspection, and Refunds</h2>
          <ul>
            <li>Approved return instructions are provided after review.</li>
            <li>International buyers are responsible for return shipping.</li>
            <li>Returned items are inspected before the final refund amount is determined.</li>
            <li>Approved refunds are issued after inspection, including any documented deductions.</li>
          </ul>
        </article>
      </section>

      <section className="policies-contact">
        <div>
          <h2>Questions Before Ordering?</h2>
          <p>Contact us before purchasing and include the listing or part number.</p>
        </div>
        <div className="policies-actions">
          <Link className="policies-button policies-button--primary" to="/contact">
            Contact Us
          </Link>
          <Link className="policies-button" to="/browse">
            Browse Parts
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Policies;
