import React, { useMemo, useRef, useState } from "react";
import toastr from "toastr";
import partsService from "../service/partsService";

/**
 * Reusable drag/drop + click file picker.
 *
 * AddItem usage:
 * - pass files + onFilesChange
 * - showUploadButton={false}
 *
 * AdminPartDetails usage:
 * - pass partId
 * - showUploadButton={true} (uploads immediately)
 */
function ImageDropZone({
  partId = null,
  files = [],
  onFilesChange,
  onUploaded,
  disabled = false,
  showUploadButton = true,
  title = "Add Photos (Drag & Drop or Click)",
  helper = "Primary image will be the first file (index 0).",
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const okTypes = useMemo(() => ["image/jpeg", "image/png", "image/webp"], []);

  const processFiles = (incoming) => {
    const list = Array.from(incoming || []);
    if (list.length === 0) return;

    const invalid = list.find((f) => !okTypes.includes(f.type));
    if (invalid) {
      toastr.error("All images must be JPG, PNG, or WEBP.");
      return;
    }

    onFilesChange?.(list);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handlePick = (e) => {
    if (disabled) return;
    processFiles(e.target.files);
    e.target.value = ""; // allow selecting the same files again
  };

  const uploadNow = async () => {
    if (!partId) {
      toastr.error("Part Id is missing.");
      return;
    }
    if (!files?.length) {
      toastr.error("Select at least one image.");
      return;
    }

    try {
      setUploading(true);
      await partsService.addPartImages(partId, files);
      toastr.success("Images uploaded.");
      onFilesChange?.([]);
      onUploaded?.();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.errors?.[0] ||
        err?.response?.data?.message ||
        "Upload failed.";
      toastr.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const canUpload =
    !!partId && files.length > 0 && !disabled && !uploading && showUploadButton;

  return (
    <div>
      <div
        className={`apd-dropzone ${isDragging ? "apd-dropzone--active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <div className="apd-dropzone__title">{title}</div>
        <div className="apd-subtle" style={{ marginTop: "8px" }}>
          {helper}
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          disabled={disabled || uploading}
          onChange={handlePick}
          accept="image/jpeg,image/png,image/webp"
        />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <div className="apd-subtle">{files.length} file(s) selected</div>

          <button
            type="button"
            className="apd-btn apd-btn--outlined apd-btn--sm"
            disabled={disabled || uploading}
            onClick={() => onFilesChange?.([])}
          >
            Clear
          </button>

          {showUploadButton && (
            <button
              type="button"
              className="apd-btn apd-btn--primary apd-btn--sm"
              disabled={!canUpload}
              onClick={uploadNow}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageDropZone;
