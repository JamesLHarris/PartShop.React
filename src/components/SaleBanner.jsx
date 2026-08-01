import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toastr from "toastr";
import discountBannerService from "../service/discountBannerService";
import "./SaleBanner.css";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

function SaleBanner() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      discountBannerService
        .getActiveBanner()
        .then((response) => {
          if (!mounted) return;
          const item = response?.item || null;
          const dismissed = item
            ? sessionStorage.getItem(`sale-banner-dismissed-${item.id}`) === "1"
            : false;
          setBanner(dismissed ? null : item);
        })
        .catch(() => {
          if (mounted) setBanner(null);
        });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!banner) return null;

  const dismiss = () => {
    sessionStorage.setItem(`sale-banner-dismissed-${banner.id}`, "1");
    setBanner(null);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(banner.code || "");
      toastr.success("Discount code copied.");
    } catch {
      toastr.info(`Discount code: ${banner.code}`);
    }
  };

  const isInternalLink = banner.linkUrl?.startsWith("/");

  return (
    <section className="sale-banner" aria-label="Current sale">
      <div className="sale-banner__content">
        <div className="sale-banner__copy">
          {banner.headline ? <strong>{banner.headline}</strong> : null}
          <span>{banner.message}</span>
        </div>

        <div className="sale-banner__actions">
          {banner.code ? (
            <button type="button" className="sale-banner__code" onClick={copyCode}>
              Copy {banner.code}
            </button>
          ) : null}

          {banner.linkUrl && banner.linkText ? (
            isInternalLink ? (
              <Link className="sale-banner__link" to={banner.linkUrl}>
                {banner.linkText}
              </Link>
            ) : (
              <a className="sale-banner__link" href={banner.linkUrl}>
                {banner.linkText}
              </a>
            )
          ) : null}

          <button
            type="button"
            className="sale-banner__dismiss"
            aria-label="Dismiss sale banner"
            onClick={dismiss}
          >
            ×
          </button>
        </div>
      </div>
    </section>
  );
}

export default SaleBanner;
