import React from "react";
import { Link } from "react-router-dom";
import "./About.css";

function About() {
  return (
    <main className="about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero__content">
          <p className="about-eyebrow">GR &amp; Sons (dporschepartsman)</p>
          <h1 id="about-title">About Us</h1>
          <p className="about-hero__lead">
            A trusted source for quality Porsche parts, backed by hands-on
            experience, personalized service, and a lifelong passion for the
            marque.
          </p>

          <div className="about-hero__actions">
            <Link className="about-button about-button--primary" to="/browse">
              Browse Parts
            </Link>
            <Link className="about-button about-button--secondary" to="/contact">
              Contact Us
            </Link>
          </div>
        </div>

        <aside className="about-hero__summary" aria-label="Company highlights">
          <div className="about-highlight">
            <strong>Founded</strong>
            <span>2006</span>
          </div>
          <div className="about-highlight">
            <strong>Specialty</strong>
            <span>Classic and modern Porsche parts</span>
          </div>
          <div className="about-highlight">
            <strong>Customers</strong>
            <span>Enthusiasts, restorers, workshops, and racing teams</span>
          </div>
        </aside>
      </section>

      <section className="about-story" aria-label="Our story">
        <article className="about-story__main">
          <h2>Experience Built Around Porsche</h2>

          <p>
            Founded in 2006 by lifelong Porsche enthusiast George Risteski,
            GR &amp; Sons (dporschepartsman) has become a trusted source for
            quality Porsche parts for enthusiasts, restorers, and professional
            workshops around the world. What began as a small garage operation
            has grown into a respected supplier of new, used, rebuilt, and OEM
            Porsche parts for both classic and modern Porsche models.
          </p>

          <p>
            With decades of hands-on experience restoring and maintaining
            Porsche vehicles, George built the company on a passion for
            excellence and a commitment to helping fellow Porsche owners keep
            their cars on the road. From Porsche classics to newer models, we
            understand the importance of sourcing dependable, high-quality
            components at competitive prices.
          </p>

          <p>
            Our extensive inventory includes used Porsche parts, rebuilt
            Porsche components, OEM Porsche parts, engines, transmissions, body
            panels, interior components, suspension parts, electrical
            components, and hard-to-find replacement parts for a wide range of
            Porsche models. Whether you are completing a restoration, building
            a vintage race car, repairing a daily driver, or performing routine
            maintenance, we have the parts and expertise to help.
          </p>

          <p>
            Today, GR &amp; Sons proudly serves professional engine builders,
            Porsche restoration shops, vintage racing teams, dealerships,
            independent repair facilities, and thousands of Porsche enthusiasts
            worldwide. We are committed to providing accurate product
            information, exceptional customer service, fast shipping, and
            affordable pricing on the Porsche parts you need.
          </p>

          <p>
            At GR &amp; Sons, our passion for Porsche drives everything we do.
            We take pride in helping owners preserve, restore, and enjoy these
            iconic sports cars by supplying reliable Porsche parts backed by
            experience, integrity, and personalized service.
          </p>
        </article>

        <aside className="about-story__sidebar">
          <section className="about-info-card">
            <h2>What We Supply</h2>
            <ul>
              <li>New, used, rebuilt, and OEM Porsche parts</li>
              <li>Engines and transmissions</li>
              <li>Body, interior, suspension, and electrical components</li>
              <li>Hard-to-find classic and modern replacement parts</li>
            </ul>
          </section>

          <section className="about-info-card">
            <h2>Contact GR &amp; Sons</h2>

            <address className="about-contact">
              <a href="tel:+19498610516">1 (949) 861-0516</a>
              <a href="mailto:GRandSonsparts@gmail.com">
                GRandSonsparts@gmail.com
              </a>
              <span>GR&amp;Sons (dporschepartsman)</span>
              <span>30025 Alicia Pkwy #563</span>
              <span>Laguna Niguel, CA 92677</span>
            </address>
          </section>
        </aside>
      </section>
    </main>
  );
}

export default About;
