import express from "express";
import bcrypt from "bcrypt";
import { authenticateToken } from "../middleware/auth.js";
import PrivateRoom from "../models/PrivateRoom.js";

const router = express.Router();

// Create private room (requires authentication)
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const { name, key } = req.body;
    const { username } = req.user;

    if (!name || !key) {
      return res.status(400).json({ ok: false, error: "Room name and key required" });
    }

    // Clean room name (same as existing cleanRoom function)
    const cleanName = String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .slice(0, 24);

    if (!cleanName) {
      return res.status(400).json({ ok: false, error: "Valid room name required" });
    }

    if (key.length < 3) {
      return res.status(400).json({ ok: false, error: "Room key must be at least 3 characters" });
    }

    // Check if room already exists
    const existingRoom = await PrivateRoom.findOne({ name: cleanName });
    if (existingRoom) {
      return res.status(400).json({ ok: false, error: "Room name already taken" });
    }

    // Hash the room key
    const hashedKey = await bcrypt.hash(key, 10);

    const privateRoom = new PrivateRoom({
      name: cleanName,
      key: hashedKey,
      creator: username,
      isPrivate: true,
    });

    await privateRoom.save();

    res.json({
      ok: true,
      room: {
        name: cleanName,
        creator: username,
        isPrivate: true,
        createdAt: privateRoom.createdAt,
      },
    });
  } catch (error) {
    console.error("Room creation error:", error);
    res.status(500).json({ ok: false, error: "Failed to create room" });
  }
});

// Get user's accessible rooms
router.get("/list", authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;

    // Get all private rooms (we'll filter client-side based on access)
    const privateRooms = await PrivateRoom.find({}, "name creator isPrivate createdAt").lean();

    res.json({
      ok: true,
      rooms: privateRooms.map(room => ({
        name: room.name,
        creator: room.creator,
        isPrivate: room.isPrivate,
        createdAt: room.createdAt,
        canAccess: room.creator === username, // Creator can always access
      })),
    });
  } catch (error) {
    console.error("Room list error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch rooms" });
  }
});

// Verify room key
router.post("/verify-key", authenticateToken, async (req, res) => {
  try {
    const { roomName, key } = req.body;

    if (!roomName || !key) {
      return res.status(400).json({ ok: false, error: "Room name and key required" });
    }

    const room = await PrivateRoom.findOne({ name: roomName });
    if (!room) {
      return res.status(404).json({ ok: false, error: "Room not found" });
    }

    const keyValid = await bcrypt.compare(key, room.key);

    res.json({
      ok: true,
      keyValid,
      room: keyValid ? {
        name: room.name,
        creator: room.creator,
        isPrivate: room.isPrivate,
      } : null,
    });
  } catch (error) {
    console.error("Key verification error:", error);
    res.status(500).json({ ok: false, error: "Failed to verify key" });
  }
});

export default router;