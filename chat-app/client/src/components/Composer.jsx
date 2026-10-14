import { useRef, useState } from "react";

export default function Composer({ onSend, onTyping, onFileUpload, disabled, room }) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const textRef = useRef(null);
  const fileInputRef = useRef(null);

  const submit = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
    if (textRef.current) textRef.current.style.height = "auto";
  };

  const onKeyDown = (e) => {
    // Enter sends, Shift+Enter inserts a newline
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onChange = (e) => {
    setText(e.target.value);
    onTyping();
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      alert("File too large! Maximum size is 20MB.");
      return;
    }

    // Check file type
    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/webm", "video/quicktime",
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", "application/rtf"
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("File type not supported. Allowed: Images, Videos (MP4, WebM), Documents (PDF, DOCX, TXT)");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      if (data.ok && data.file) {
        onFileUpload(data.file);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.rtf"
        disabled={disabled || uploading}
      />

      <button
        type="button"
        className="file-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        title="Upload file (20MB max)"
        aria-label="Upload file"
      >
        {uploading ? `Uploading ${uploadProgress}%` : "📎"}
      </button>

      <textarea
        ref={textRef}
        rows={1}
        value={text}
        maxLength={2000}
        disabled={disabled || uploading}
        placeholder={disabled ? "Reconnecting…" : `Message #${room}`}
        onChange={onChange}
        onKeyDown={onKeyDown}
        aria-label={`Message #${room}`}
      />
      <button className="primary" disabled={disabled || uploading || !text.trim()} aria-label="Send message">
        {uploading ? "Uploading..." : "Send"}
      </button>
    </form>
  );
}
