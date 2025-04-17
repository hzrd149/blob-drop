interface FilePreviewProps {
  file: File;
  onReset?: () => void;
}

export default function FilePreview(props: FilePreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="card bg-base-100 shadow-sm p-4">
      <div className="card-title text-sm">{props.file.name}</div>
      <div className="card-body p-0">
        <div className="text-sm text-base-content/70">
          <p>Type: {props.file.type || "Unknown"}</p>
          <p>Size: {formatFileSize(props.file.size)}</p>
        </div>
      </div>
      {props.onReset && (
        <button
          className="btn btn-link absolute right-2 top-2"
          onClick={props.onReset}
        >
          Reset
        </button>
      )}
    </div>
  );
}
