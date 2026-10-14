import express from "express";
import { generateToken, verifyToken } from "../middleware/auth.js";
import Session from "../models/Session.js";
import { randomUUID } from "crypto";

const router = express.Router();

// Login - create new session
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password required" });
    }

    // Simple session-based auth - just check if username is provided
    // In real app, you'd validate against stored credentials
    const cleanUsername = String(username).trim().replace(/\s+/g, " ").slice(0, 24);

    if (!cleanUsername) {
      return res.status(400).json({ ok: false, error: "Valid username required" });
    }

    // For session-based auth, we just need a username and password attempt
    // Password can be anything for now, but we'll require it
    if (password.length < 3) {
      return res.status(400).json({ ok: false, error: "Password must be at least 3 characters" });
    }

    const sessionId = randomUUID();
    const session = new Session({
      sessionId,
      username: cleanUsername,
      isAuthenticated: true,
    });

    await session.save();

    const token = generateToken({ sessionId, username: cleanUsername });

    res.json({
      ok: true,
      token,
      user: { username: cleanUsername, sessionId },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ ok: false, error: "Login failed" });
  }
});

// Logout - destroy session
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.sessionId) {
        await Session.deleteOne({ sessionId: decoded.sessionId });
      }
    }

    res.json({ ok: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ ok: false, error: "Logout failed" });
  }
});

// Verify token and session
router.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ ok: false, error: "No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ ok: false, error: "Invalid token" });
    }

    const session = await Session.findOne({ sessionId: decoded.sessionId });
    if (!session) {
      return res.status(403).json({ ok: false, error: "Session not found" });
    }

    res.json({
      ok: true,
      user: { username: session.username, sessionId: session.sessionId },
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ ok: false, error: "Verification failed" });
  }
});

export default router;