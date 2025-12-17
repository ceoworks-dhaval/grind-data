import { useState, useRef } from "react";
import "./FileUpload.css";

interface Props {
  onFileLoaded: (file: File) => void;
  isLoading: boolean;
  currentFile: string | null;
}

export function FileUpload({ onFileLoaded, isLoading, currentFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".xlsx")) {
      onFileLoaded(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileLoaded(file);
    }
  };

  return (
    <div
      className={`file-upload ${isDragging ? "dragging" : ""} ${isLoading ? "loading" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {isLoading ? (
        <div className="upload-loading">
          <div className="spinner-small"></div>
          <span>Parsing Excel file...</span>
        </div>
      ) : currentFile ? (
        <div className="upload-loaded">
          <span className="file-icon">📊</span>
          <span className="file-name">{currentFile}</span>
          <span className="change-hint">Click to change file</span>
        </div>
      ) : (
        <div className="upload-prompt">
          <span className="upload-icon">📁</span>
          <span className="upload-text">
            Drop Excel file here or click to browse
          </span>
          <span className="upload-hint">.xlsx files only</span>
        </div>
      )}
    </div>
  );
}
