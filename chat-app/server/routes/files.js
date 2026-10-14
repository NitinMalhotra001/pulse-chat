import express from "express";
import path from "path";
import fs from "fs/promises";
import { uploadFile, getFileCategory, formatFileSize } from "../middleware/upload.js";
import { randomUUID } from "crypto";

const router = express.Router();

// File upload endpoint
router.post("/upload", (req, res) => {
  uploadFile(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err) {
        console.error("Upload error:", err);

        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            ok: false,
            error: "File too large. Maximum size is 20MB.",
          });
        }

        if (err.message.includes("File type")) {
          return res.status(400).json({
            ok: false,
            error: err.message,
          });
        }

        return res.status(500).json({
          ok: false,
          error: "Upload failed: " + err.message,
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: "No file uploaded",
        });
      }

      const file = req.file;

      // Create file metadata
      const fileData = {
        id: randomUUID(),
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        category: getFileCategory(file.mimetype),
        formattedSize: formatFileSize(file.size),
        url: `/api/files/download/${file.filename}`,
        uploadedAt: new Date().toISOString(),
      };

      console.log("File uploaded successfully:", {
        filename: file.filename,
        originalName: file.originalname,
        size: formatFileSize(file.size),
        type: file.mimetype,
      });

      res.json({
        ok: true,
        file: fileData,
      });
    } catch (error) {
      console.error("Upload processing error:", error);
      res.status(500).json({
        ok: false,
        error: "Failed to process upload",
      });
    }
  });
});

// File download endpoint
router.get("/download/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    // Sanitize filename to prevent path traversal
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = path.join(process.cwd(), "uploads", safeName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        ok: false,
        error: "File not found",
      });
    }

    // Set appropriate headers
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      ok: false,
      error: "Download failed",
    });
  }
});

// Get file info endpoint
router.get("/info/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = path.join(process.cwd(), "uploads", safeName);

    const stats = await fs.stat(filePath);

    res.json({
      ok: true,
      file: {
        filename: safeName,
        size: stats.size,
        formattedSize: formatFileSize(stats.size),
        uploadedAt: stats.birthtime.toISOString(),
        url: `/api/files/download/${safeName}`,
      },
    });
  } catch (error) {
    res.status(404).json({
      ok: false,
      error: "File not found",
    });
  }
});

export default router;