import React, { useState, useRef } from "react";
import partsService from "../service/partsService";

function ImageDropZone({ partId }) {
  const [files, setFiles] = useState([]);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
  };

  const handleUpload = async () => {
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      await partsService.uploadMultipleImages(partId, formData);
      alert("Images uploaded successfully.");
      setFiles([]);
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    }
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: "2px dashed #ccc",
          padding: "40px",
          textAlign: "center",
          marginBottom: "20px",
        }}
        onClick={() => inputRef.current.click()}
      >
        Drag & Drop Images Here or Click to Select
      </div>

      <input
        type="file"
        multiple
        ref={inputRef}
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {files.length > 0 && (
        <>
          <p>{files.length} files selected</p>
          <button onClick={handleUpload}>Upload</button>
        </>
      )}
    </div>
  );
}

export default ImageDropZone;
