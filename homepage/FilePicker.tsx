import { useState } from "react";

interface FilePickerProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function FilePicker(props: FilePickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!props.disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (props.disabled) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      setError("No file dropped");
      return;
    }

    if (files.length > 1) {
      setError("Please drop only one file");
      return;
    }

    setError(null);
    props.onFileSelect(files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    props.onFileSelect(file);
  };

  return (
    <>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-base-300 hover:border-primary hover:bg-primary/5"
        } ${props.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          !props.disabled && document.getElementById("fileInput")?.click()
        }
      >
        <input
          id="fileInput"
          type="file"
          className="hidden"
          onChange={handleFileInput}
          disabled={props.disabled}
        />

        <div className="flex flex-col items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
          <div className="text-base-content/70">
            <p className="font-medium">Click to upload or drag and drop</p>
            <p className="text-sm">your file here</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}
    </>
  );
}
