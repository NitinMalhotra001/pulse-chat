import { useState } from "react";

export default function FileMessage({ file, mine, onRetry }) {
  const [showPreview, setShowPreview] = useState(false);

  const isImage = file.category === "image";
  const isVideo = file.category === "video";
  const isDocument = file.category === "document";

  const getFileIcon = () => {
    if (isImage) return "🖼️";
    if (isVideo) return "🎬";
    if (file.mimeType === "application/pdf") return "📄";
    if (file.mimeType?.includes("word") || file.originalName?.endsWith(".docx")) return "📝";
    if (file.mimeType === "text/plain" || file.originalName?.endsWith(".txt")) return "📋";
    return "📎";
  };

  return (
    <>
      <div className={`msg ${mine ? "mine" : ""}`}>
        <div className={`bubble file-bubble ${file.pending ? "pending" : ""} ${file.failed ? "failed" : ""}`}>
          {isImage && (
            <div className="file-content image-preview">
              <img
                src={file.url}
                alt={file.originalName}
                onClick={() => setShowPreview(true)}
                style={{ cursor: "pointer", maxWidth: "200px", maxHeight: "200px", borderRadius: "8px" }}
              />
              <div className="file-info">
                <span className="file-name">{file.originalName}</span>
                <span className="file-size">{file.formattedSize}</span>
              </div>
            </div>
          )}

          {isVideo && (
            <div className="file-content video-preview">
              <div className="video-placeholder" onClick={() => setShowPreview(true)} style={{ cursor: "pointer" }}>
                <span className="play-button">▶️</span>
                <span className="video-icon">🎬</span>
              </div>
              <div className="file-info">
                <span className="file-name">{file.originalName}</span>
                <span className="file-size">{file.formattedSize}</span>
              </div>
            </div>
          )}

          {isDocument && (
            <div className="file-content document-preview">
              <div className="document-icon">{getFileIcon()}</div>
              <div className="file-info">
                <span className="file-name">{file.originalName}</span>
                <span className="file-size">{file.formattedSize}</span>
              </div>
              <a href={file.url} download={file.originalName} className="download-link">
                ⬇️ Download
              </a>
            </div>
          )}

          <span className="meta">
            {file.failed ? (
              <button className="retry" onClick={() => onRetry?.(file)}>
                Failed · Retry
              </button>
            ) : file.pending ? (
              "Sending…"
            ) : (
              new Date(file.uploadedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            )}
          </span>
        </div>
      </div>

      {/* Image Preview Modal */}
      {showPreview && isImage && (
        <>
          <div className="modal-scrim" onClick={() => setShowPreview(false)} />
          <div className="file-preview-modal">
            <button className="close-btn" onClick={() => setShowPreview(false)}>✕</button>
            <img src={file.url} alt={file.originalName} className="preview-image" />
            <div className="preview-info">
              <span>{file.originalName}</span>
              <a href={file.url} download={file.originalName} className="download-link">
                ⬇️ Download
              </a>
            </div>
          </div>
        </>
      )}

      {/* Video Preview Modal */}
      {showPreview && isVideo && (
        <>
          <div className="modal-scrim" onClick={() => setShowPreview(false)} />
          <div className="file-preview-modal">
            <button className="close-btn" onClick={() => setShowPreview(false)}>✕</button>
            <video controls className="preview-video">
              <source src={file.url} type={file.mimeType} />
              Your browser does not support video playback.
            </video>
            <div className="preview-info">
              <span>{file.originalName}</span>
              <a href={file.url} download={file.originalName} className="download-link">
                ⬇️ Download
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}