import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./PhotoLightbox.css";

function PhotoLightbox({
  open,
  images = [],
  startIndex = 0,
  onClose,
  onImageChange,
  title = "Part photos",
}) {
  const cleanImages = useMemo(
    () => images.filter((image) => image?.src),
    [images],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;

    const safeIndex = Math.min(
      Math.max(Number(startIndex) || 0, 0),
      Math.max(cleanImages.length - 1, 0),
    );
    setIndex((current) => (current === safeIndex ? current : safeIndex));
  }, [open, startIndex, cleanImages.length]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }

      if (cleanImages.length > 1 && event.key === "ArrowLeft") {
        event.preventDefault();
        const nextIndex = index <= 0 ? cleanImages.length - 1 : index - 1;
        setIndex(nextIndex);
        onImageChange?.(cleanImages[nextIndex]?.src || "");
      }

      if (cleanImages.length > 1 && event.key === "ArrowRight") {
        event.preventDefault();
        const nextIndex =
          index >= cleanImages.length - 1 ? 0 : index + 1;
        setIndex(nextIndex);
        onImageChange?.(cleanImages[nextIndex]?.src || "");
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, cleanImages, index, onClose, onImageChange]);

  if (!open || cleanImages.length === 0) return null;

  const currentImage = cleanImages[index];
  const canNavigate = cleanImages.length > 1;

  const changeImage = (nextIndex) => {
    setIndex(nextIndex);
    onImageChange?.(cleanImages[nextIndex]?.src || "");
  };

  const previous = () => {
    const nextIndex = index <= 0 ? cleanImages.length - 1 : index - 1;
    changeImage(nextIndex);
  };

  const next = () => {
    const nextIndex = index >= cleanImages.length - 1 ? 0 : index + 1;
    changeImage(nextIndex);
  };

  return createPortal(
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="photo-lightbox__panel">
        <button
          type="button"
          className="photo-lightbox__close"
          aria-label="Close photo viewer"
          onClick={onClose}
        >
          <svg
            className="photo-lightbox__icon photo-lightbox__icon--close"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 6L18 18M18 6L6 18" />
          </svg>
        </button>

        {canNavigate && (
          <button
            type="button"
            className="photo-lightbox__arrow photo-lightbox__arrow--left"
            aria-label="Previous photo"
            onClick={previous}
          >
            <svg
              className="photo-lightbox__icon photo-lightbox__icon--arrow"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M15 5L8 12L15 19" />
            </svg>
          </button>
        )}

        <div className="photo-lightbox__stage">
          <img
            src={currentImage.src}
            alt={currentImage.alt || title}
            className="photo-lightbox__image"
          />
        </div>

        {canNavigate && (
          <button
            type="button"
            className="photo-lightbox__arrow photo-lightbox__arrow--right"
            aria-label="Next photo"
            onClick={next}
          >
            <svg
              className="photo-lightbox__icon photo-lightbox__icon--arrow"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 5L16 12L9 19" />
            </svg>
          </button>
        )}

        <div className="photo-lightbox__footer">
          <span className="photo-lightbox__counter">
            {index + 1} / {cleanImages.length}
          </span>
          <span className="photo-lightbox__hint">
            Use the arrows or keyboard ← →. Press Esc to close.
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default PhotoLightbox;
