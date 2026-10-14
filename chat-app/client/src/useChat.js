import { useCallback, useEffect, useReducer, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const ACK_TIMEOUT = 8000;
const TYPING_IDLE_MS = 1500;
const SESSION_KEY = "pulse-chat-session";
const AUTH_KEY = "pulse-chat-auth";

const initial = {
  status: "connecting", // connecting | connected | disconnected
  joined: false,
  authenticated: false,
  me: null,
  room: null,
  rooms: [],
  users: [],
  messages: [],
  hasMore: false,
  typers: {}, // userId -> name
  error: null,
  authToken: null,
  username: null,
};

// Merge by id, keep chronological order, drop duplicates
const mergeMessages = (list, incoming) => {
  const seen = new Set(list.map((m) => m.id));
  const extra = incoming.filter((m) => !seen.has(m.id));
  return extra.length ? [...list, ...extra].sort((a, b) => a.ts - b.ts) : list;
};

function reducer(state, action) {
  switch (action.type) {
    case "status":
      return { ...state, status: action.status };
    case "login":
      return {
        ...state,
        authenticated: true,
        authToken: action.token,
        username: action.username,
        error: null,
      };
    case "logout":
      return {
        ...state,
        authenticated: false,
        authToken: null,
        username: null,
        joined: false,
        room: null,
        messages: [],
        users: [],
        typers: {},
      };
    case "rooms":
      return { ...state, rooms: action.rooms };
    case "joined":
      return {
        ...state,
        joined: true,
        error: null,
        me: action.me,
        room: action.room,
        users: action.users,
        hasMore: action.hasMore,
        // keep unsent/failed optimistic messages for this room across reconnects
        messages: mergeMessages(
          state.messages.filter((m) => m.room === action.room && m.pending),
          action.messages
        ),
        typers: {},
      };
    case "left":
      return { ...state, joined: false, room: null, messages: [], users: [], typers: {} };
    case "presence":
      return { ...state, users: action.users };
    case "message": {
      const m = action.message;
      if (m.room !== state.room) return state;
      // Replace optimistic copy if this is our own message echoing back
      if (m.clientId && state.messages.some((x) => x.clientId === m.clientId)) {
        return {
          ...state,
          messages: state.messages.map((x) => (x.clientId === m.clientId ? m : x)),
        };
      }
      return { ...state, messages: mergeMessages(state.messages, [m]) };
    }
    case "optimistic":
      return { ...state, messages: [...state.messages, action.message] };
    case "mark": {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.clientId === action.clientId && m.pending ? { ...m, ...action.patch } : m
        ),
      };
    }
    case "older":
      return {
        ...state,
        hasMore: action.hasMore,
        messages: mergeMessages(state.messages, action.messages),
      };
    case "typing": {
      const typers = { ...state.typers };
      if (action.typing) typers[action.userId] = action.name;
      else delete typers[action.userId];
      return { ...state, typers };
    }
    case "error":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

export function useChat() {
  const [state, dispatch] = useReducer(reducer, initial);
  const socketRef = useRef(null);
  const sessionRef = useRef(null); // { name, room } used to auto-rejoin after reconnect
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const loadingOlder = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const doJoin = useCallback((name, room, roomKey = null) => {
    const socket = socketRef.current;
    const s = stateRef.current;
    return new Promise((resolve) => {
      const payload = { name, room };
      if (s.authToken) payload.token = s.authToken;
      if (roomKey) payload.roomKey = roomKey;

      socket.timeout(ACK_TIMEOUT).emit("join", payload, (err, res) => {
        if (err || !res?.ok) {
          const error = err ? "Server did not respond" : res.error || "Could not join";
          dispatch({ type: "error", error });
          return resolve(false);
        }
        sessionRef.current = { name: res.me.name, room: res.room };
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(sessionRef.current));
        } catch {}
        dispatch({
          type: "joined",
          me: res.me,
          room: res.room,
          messages: res.messages,
          hasMore: res.hasMore,
          users: res.users,
        });
        resolve(true);
      });
    });
  }, []);

  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: false });
    socketRef.current = socket;

    // Try to restore auth from localStorage
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      if (auth?.token && auth?.username) {
        dispatch({
          type: "login",
          token: auth.token,
          username: auth.username,
        });
      }
    } catch {}

    socket.on("connect", () => {
      dispatch({ type: "status", status: "connected" });
      // Rejoin automatically after a dropped connection
      if (sessionRef.current) doJoin(sessionRef.current.name, sessionRef.current.room);
    });
    socket.on("disconnect", () => dispatch({ type: "status", status: "disconnected" }));
    socket.on("connect_error", () => dispatch({ type: "status", status: "disconnected" }));
    socket.on("rooms", (rooms) => dispatch({ type: "rooms", rooms }));
    socket.on("presence", (users) => dispatch({ type: "presence", users }));
    socket.on("message", (message) => dispatch({ type: "message", message }));
    socket.on("typing", (t) => dispatch({ type: "typing", ...t }));

    socket.connect();
    return () => {
      clearTimeout(typingTimer.current);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [doJoin]);

  const join = useCallback((name, room, roomKey = null) => doJoin(name, room, roomKey), [doJoin]);

  const login = useCallback(async (username, password) => {
    try {
      console.log('🔐 Attempting login with:', { username, password });

      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log('🔐 Login response:', data);

      if (!data.ok) {
        console.log('❌ Login failed:', data.error);
        dispatch({ type: "error", error: data.error || "Login failed" });
        return false;
      }

      console.log('✅ Login successful, setting token');
      dispatch({
        type: "login",
        token: data.token,
        username: data.user.username,
      });

      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ token: data.token, username: data.user.username }));
      } catch {}

      return true;
    } catch (error) {
      console.log('💥 Login error:', error);
      dispatch({ type: "error", error: "Login failed: " + error.message });
      return false;
    }
  }, []);

  const signup = useCallback(async (username, password) => {
    try {
      console.log('📝 Attempting signup with:', { username, password });

      const res = await fetch(`${SERVER_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log('📝 Signup response:', data);

      if (!data.ok) {
        console.log('❌ Signup failed:', data.error);
        dispatch({ type: "error", error: data.error || "Signup failed" });
        return false;
      }

      console.log('✅ Signup successful');
      dispatch({ type: "error", error: null });
      return true;
    } catch (error) {
      console.log('💥 Signup error:', error);
      dispatch({ type: "error", error: "Signup failed: " + error.message });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    const s = stateRef.current;
    if (s.authToken) {
      try {
        await fetch(`${SERVER_URL}/api/auth/logout`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${s.authToken}` },
        });
      } catch {}
    }

    socketRef.current?.emit("leave");
    sessionRef.current = null;
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(AUTH_KEY);
    } catch {}
    dispatch({ type: "logout" });
  }, []);

  const createPrivateRoom = useCallback(async (roomName, roomKey) => {
    const s = stateRef.current;
    if (!s.authToken) {
      dispatch({ type: "error", error: "Authentication required" });
      return false;
    }

    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${s.authToken}`,
        },
        body: JSON.stringify({ name: roomName, key: roomKey }),
      });

      const data = await res.json();
      if (!data.ok) {
        dispatch({ type: "error", error: data.error || "Failed to create room" });
        return false;
      }

      dispatch({ type: "error", error: null });
      return true;
    } catch (error) {
      dispatch({ type: "error", error: "Failed to create room: " + error.message });
      return false;
    }
  }, []);

  const leave = useCallback(() => {
    socketRef.current?.emit("leave");
    sessionRef.current = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    dispatch({ type: "left" });
  }, []);

  const send = useCallback((text, existingClientId) => {
    const s = stateRef.current;
    const body = text.trim();
    if (!body || !s.me || !s.room) return;
    const clientId = existingClientId || crypto.randomUUID();

    if (existingClientId) {
      dispatch({ type: "mark", clientId, patch: { failed: false } });
    } else {
      // Optimistic message: appears instantly, reconciled when the server echoes it
      dispatch({
        type: "optimistic",
        message: {
          id: `local-${clientId}`,
          clientId,
          room: s.room,
          userId: s.me.id,
          name: s.me.name,
          text: body,
          ts: Date.now(),
          pending: true,
          failed: false,
        },
      });
    }

    socketRef.current.timeout(ACK_TIMEOUT).emit("message", { text: body, clientId }, (err, res) => {
      if (err || !res?.ok) dispatch({ type: "mark", clientId, patch: { failed: true } });
    });

    // sending ends typing state
    clearTimeout(typingTimer.current);
    isTyping.current = false;
  }, []);

  const sendFile = useCallback((fileData) => {
    const s = stateRef.current;
    if (!s.me || !s.room) return;

    const fileMessage = {
      id: randomUUID(),
      clientId: randomUUID(),
      type: "file",
      file: fileData,
      room: s.room,
      userId: s.me.id,
      name: s.me.name,
      ts: Date.now(),
      pending: true,
      failed: false,
    };

    // Add optimistic file message
    dispatch({
      type: "optimistic",
      message: fileMessage,
    });

    // Broadcast file to room via Socket.IO
    socketRef.current.timeout(ACK_TIMEOUT).emit("file", { file: fileData, clientId: fileMessage.clientId }, (err, res) => {
      if (err || !res?.ok) {
        dispatch({ type: "mark", clientId: fileMessage.clientId, patch: { failed: true } });
      }
    });
  }, []);

  const retry = useCallback(
    (message) => send(message.text, message.clientId),
    [send]
  );

  const notifyTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit("typing", true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit("typing", false);
    }, TYPING_IDLE_MS);
  }, []);

  const loadOlder = useCallback(() => {
    const s = stateRef.current;
    if (loadingOlder.current || !s.hasMore || !s.room) return Promise.resolve(false);
    const first = s.messages.find((m) => !m.pending);
    if (!first) return Promise.resolve(false);
    loadingOlder.current = true;
    return new Promise((resolve) => {
      socketRef.current
        .timeout(ACK_TIMEOUT)
        .emit("history", { room: s.room, before: first.id }, (err, res) => {
          loadingOlder.current = false;
          if (err || !res?.ok) return resolve(false);
          dispatch({ type: "older", messages: res.messages, hasMore: res.hasMore });
          resolve(true);
        });
    });
  }, []);

  const savedSession = () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  };

  return {
    state,
    join,
    leave,
    send,
    sendFile,
    retry,
    notifyTyping,
    loadOlder,
    savedSession,
    login,
    signup,
    logout,
    createPrivateRoom,
  };
}
