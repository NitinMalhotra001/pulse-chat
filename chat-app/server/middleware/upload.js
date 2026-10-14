import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

// Create uploads directory path
const uploadsDir = path.join(process.cwd(), "uploads");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_uuid_originalname
    const uniqueName = `${Date.now()}_${randomUUID()}_${file.originalname}`;
    // Sanitize filename - remove dangerous characters
    const safeName = uniqueName.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safeName);
  },
});

// File filter - only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",

    // Videos
    "video/mp4",
    "video/webm",
    "video/quicktime", // .mov files

    // Documents
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "text/plain", // .txt
    "application/rtf", // .rtf
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported. Allowed types: Images, Videos, Documents`), false);
  }
};

// Configure multer with file size limit (20MB)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB in bytes
    files: 1, // Allow only 1 file per upload
  },
});

// Export single file upload middleware
export const uploadFile = upload.single("file");

// Helper function to get file type category
export const getFileCategory = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
};

// Helper function to format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};