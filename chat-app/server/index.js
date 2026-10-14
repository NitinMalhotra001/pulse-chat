import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fileRoutes from "./routes/files.js";
import path from "path";

dotenv.config();

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pulse-chat";
const corsOptions = {
  origin(origin, callback) {
    const isLocalDevOrigin =
      origin && /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
    callback(null, !origin || origin === CLIENT_ORIGIN || (!CLIENT_ORIGIN && isLocalDevOrigin));
  },
};
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const HISTORY_LIMIT = 200;
const PAGE_SIZE = 30;
const DEFAULT_ROOMS = ["general", "random", "react-help"];

const app = express();
app.use(cors({origin: process.env.CLIENT_URL,
  credentials: true}));
app.use(express.json());

// Mount file upload routes
app.use("/api/files", fileRoutes);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
});

const privateRooms = new Map();
const inMemoryUserAccounts = new Map();
const inMemorySessions = new Map();

const connectToMongo = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.warn("⚠️ MongoDB unavailable; using in-memory auth storage for local development.");
    console.warn(`   ${error.message}`);
  }
};

// MongoDB Models
const UserAccountSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // 24 hours
});

const PrivateRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  key: { type: String, required: true },
  creator: { type: String, required: true },
  isPrivate: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const UserAccount = mongoose.model("UserAccount", UserAccountSchema);
const SessionModel = mongoose.model("Session", SessionSchema);
const PrivateRoomModel = mongoose.model("PrivateRoom", PrivateRoomSchema);

const isMongoReady = () => mongoose.connection.readyState === 1;

const getStoredUserByUsername = async (username) => {
  if (!isMongoReady()) {
    return inMemoryUserAccounts.get(username) || null;
  }
  return UserAccount.findOne({ username });
};

const createStoredUser = async (username, password) => {
  if (!isMongoReady()) {
    const user = { username, password, createdAt: new Date() };
    inMemoryUserAccounts.set(username, user);
    return user;
  }

  const newUser = new UserAccount({ username, password });
  return newUser.save();
};

const getStoredSession = async (sessionId) => {
  if (!isMongoReady()) {
    return inMemorySessions.get(sessionId) || null;
  }
  return SessionModel.findOne({ sessionId });
};

const createStoredSession = async (sessionId, username) => {
  if (!isMongoReady()) {
    const session = { sessionId, username, createdAt: new Date() };
    inMemorySessions.set(sessionId, session);
    return session;
  }

  const newSession = new SessionModel({ sessionId, username });
  return newSession.save();
};

const deleteStoredSession = async (sessionId) => {
  if (!isMongoReady()) {
    inMemorySessions.delete(sessionId);
    return null;
  }

  return SessionModel.findOneAndDelete({ sessionId });
};

// In-memory storage (for temporary runtime data)
const rooms = new Map();
const users = new Map();

const getRoom = (name) => {
  if (!rooms.has(name)) rooms.set(name, { messages: [], isPrivate: false });
  return rooms.get(name);
};
DEFAULT_ROOMS.forEach(getRoom);

const cleanName = (s) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
const cleanRoom = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .slice(0, 24);
const cleanText = (s) => String(s ?? "").trim().slice(0, 2000);

const usersIn = (room) =>
  [...users.values()].filter((u) => u.room === room).map((u) => ({ id: u.id, name: u.name }));

const roomList = () => {
  const list = [...rooms.keys()].map((name) => {
    const room = rooms.get(name);
    return { name, online: usersIn(name).length, isPrivate: room.isPrivate };
  });
  return list;
};

const broadcastRoomList = () => io.emit("rooms", roomList());
const broadcastPresence = (room) => io.to(room).emit("presence", usersIn(room));

const systemMessage = (room, text) => {
  const msg = {
    id: randomUUID(),
    room,
    system: true,
    text,
    ts: Date.now(),
  };
  const r = getRoom(room);
  r.messages.push(msg);
  if (r.messages.length > HISTORY_LIMIT) r.messages.shift();
  io.to(room).emit("message", msg);
};

function leaveCurrentRoom(socket) {
  const user = users.get(socket.id);
  if (!user || !user.room) return;
  const old = user.room;
  socket.leave(old);
  user.room = null;
  socket.to(old).emit("typing", { userId: user.id, name: user.name, typing: false });
  systemMessage(old, `${user.name} left`);
  broadcastPresence(old);
}

// ===== API Routes =====

// Signup endpoint - Register new user
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password required" });
    }

    const cleanUsername = String(username).trim().replace(/\s+/g, " ").slice(0, 24);

    if (!cleanUsername) {
      return res.status(400).json({ ok: false, error: "Valid username required" });
    }

    if (password.length < 3) {
      return res.status(400).json({ ok: false, error: "Password must be at least 3 characters" });
    }

    const existingUser = await getStoredUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ ok: false, error: "Username already taken" });
    }

    await createStoredUser(cleanUsername, password);

    console.log("✅ User account created:", cleanUsername);

    res.json({
      ok: true,
      message: "Account created successfully! Please login with your credentials.",
      user: { username: cleanUsername },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ ok: false, error: "Signup failed" });
  }
});

// Login endpoint - Verify credentials and create session
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password required" });
    }

    const cleanUsername = String(username).trim().replace(/\s+/g, " ").slice(0, 24);

    if (!cleanUsername) {
      return res.status(400).json({ ok: false, error: "Valid username required" });
    }

    if (password.length < 3) {
      return res.status(400).json({ ok: false, error: "Password must be at least 3 characters" });
    }

    const userAccount = await getStoredUserByUsername(cleanUsername);
    if (!userAccount) {
      return res.status(401).json({ ok: false, error: "Invalid username or password" });
    }

    if (userAccount.password !== password) {
      return res.status(401).json({ ok: false, error: "Invalid username or password" });
    }

    const sessionId = randomUUID();
    const token = jwt.sign({ sessionId, username: cleanUsername }, JWT_SECRET, { expiresIn: "24h" });

    await createStoredSession(sessionId, cleanUsername);

    console.log("✅ User logged in:", cleanUsername);

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

// Logout endpoint
app.post("/api/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        await deleteStoredSession(decoded.sessionId);
      } catch (error) {
        console.error("Token verification error:", error);
      }
    }

    res.json({ ok: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ ok: false, error: "Logout failed" });
  }
});

// Verify token
app.get("/api/auth/verify", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ ok: false, error: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const session = await getStoredSession(decoded.sessionId);

    if (!session) {
      return res.status(403).json({ ok: false, error: "Session not found" });
    }

    res.json({
      ok: true,
      user: { username: session.username, sessionId: decoded.sessionId },
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(403).json({ ok: false, error: "Invalid token" });
  }
});

// Create private room
app.post("/api/rooms/create", (req, res) => {
  try {
    const { name, key } = req.body;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({ ok: false, error: "Invalid token" });
    }

    if (!name || !key) {
      return res.status(400).json({ ok: false, error: "Room name and key required" });
    }

    const cleanName = String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .slice(0, 24);

    if (!cleanName) {
      return res.status(400).json({ ok: false, error: "Valid room name required" });
    }

    if (rooms.has(cleanName)) {
      return res.status(400).json({ ok: false, error: "Room name already taken" });
    }

    // Store private room
    rooms.set(cleanName, { messages: [], isPrivate: true, creator: decoded.username, key });
    privateRooms.set(cleanName, { key, creator: decoded.username });

    res.json({
      ok: true,
      room: { name: cleanName, creator: decoded.username, isPrivate: true },
    });
  } catch (error) {
    console.error("Room creation error:", error);
    res.status(500).json({ ok: false, error: "Failed to create room" });
  }
});

// Verify room key
app.post("/api/rooms/verify-key", (req, res) => {
  try {
    const { roomName, key } = req.body;

    if (!roomName || !key) {
      return res.status(400).json({ ok: false, error: "Room name and key required" });
    }

    const privateRoom = privateRooms.get(roomName);
    if (!privateRoom) {
      return res.status(404).json({ ok: false, error: "Room not found" });
    }

    const keyValid = privateRoom.key === key; // Simple comparison for now

    res.json({
      ok: true,
      keyValid,
      room: keyValid ? { name: roomName, creator: privateRoom.creator, isPrivate: true } : null,
    });
  } catch (error) {
    console.error("Key verification error:", error);
    res.status(500).json({ ok: false, error: "Failed to verify key" });
  }
});

// ===== Socket.IO Events =====

io.on("connection", (socket) => {
  socket.on("join", async (payload, ack) => {
    try {
      const name = cleanName(payload?.name);
      const roomName = cleanRoom(payload?.room) || "general";
      const { token, roomKey } = payload;

      if (!name) return ack?.({ ok: false, error: "Name is required" });

      // Check if it's a private room
      const privateRoom = privateRooms.get(roomName);
      if (privateRoom) {
        if (!roomKey) {
          return ack?.({ ok: false, error: "Room key required" });
        }
        if (privateRoom.key !== roomKey) {
          return ack?.({ ok: false, error: "Invalid room key" });
        }
      }

      let user = users.get(socket.id);
      if (!user) {
        user = { id: socket.id, name, room: null };
        users.set(socket.id, user);
      } else {
        user.name = name;
      }

      if (user.room === roomName) {
        // already there
      } else {
        leaveCurrentRoom(socket);
        user.room = roomName;
        socket.join(roomName);
        getRoom(roomName);
        systemMessage(roomName, `${user.name} joined`);
      }

      const history = getRoom(roomName).messages;
      const page = history.slice(-PAGE_SIZE);
      ack?.({
        ok: true,
        me: { id: user.id, name: user.name },
        room: roomName,
        messages: page,
        hasMore: history.length > page.length,
        users: usersIn(roomName),
      });
      broadcastPresence(roomName);
      broadcastRoomList();
    } catch (error) {
      console.error("Join error:", error);
      ack?.({ ok: false, error: "Failed to join room" });
    }
  });

  socket.on("history", ({ room, before }, ack) => {
    const user = users.get(socket.id);
    if (!user || user.room !== room) return ack?.({ ok: false, messages: [], hasMore: false });
    const all = getRoom(room).messages;
    const idx = all.findIndex((m) => m.id === before);
    const end = idx === -1 ? all.length : idx;
    const start = Math.max(0, end - PAGE_SIZE);
    ack?.({ ok: true, messages: all.slice(start, end), hasMore: start > 0 });
  });

  socket.on("message", ({ text, clientId }, ack) => {
    const user = users.get(socket.id);
    if (!user?.room) return ack?.({ ok: false, error: "Join a room first" });
    const body = cleanText(text);
    if (!body) return ack?.({ ok: false, error: "Empty message" });

    const msg = {
      id: randomUUID(),
      clientId,
      room: user.room,
      userId: user.id,
      name: user.name,
      text: body,
      ts: Date.now(),
    };
    const r = getRoom(user.room);
    r.messages.push(msg);
    if (r.messages.length > HISTORY_LIMIT) r.messages.shift();

    io.to(user.room).emit("message", msg);
    socket.to(user.room).emit("typing", { userId: user.id, name: user.name, typing: false });
    ack?.({ ok: true, id: msg.id });
  });

  socket.on("typing", (typing) => {
    const user = users.get(socket.id);
    if (!user?.room) return;
    socket.to(user.room).emit("typing", { userId: user.id, name: user.name, typing: !!typing });
  });

  socket.on("leave", () => {
    leaveCurrentRoom(socket);
    broadcastRoomList();
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket);
    users.delete(socket.id);
    broadcastRoomList();
  });

  socket.emit("rooms", roomList());
});

app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size, users: users.size }));

connectToMongo();

httpServer.listen(PORT, () => {
  console.log(`✓ Chat server listening on http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for: ${CLIENT_ORIGIN || "localhost origins on any port"}`);
});

export { httpServer, io };
