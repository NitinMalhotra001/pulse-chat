# Pulse Chat

A real-time chat app with rooms, built with **React (Vite)** and **Node + Socket.IO**.

## Features

- Join with a display name and pick or create a room
- Live messaging with per-room isolation
- Online users list and room list with live counts
- **Optimistic sending**: messages appear instantly and are reconciled with the server copy via a `clientId`; failed sends show a Retry button
- **Auto-reconnect**: the client rejoins its room and shows an offline banner while disconnected
- **Infinite scroll** for older messages, with the scroll position preserved
- Smart auto-scroll with a "New messages" jump button
- Responsive layout with a mobile slide-out sidebar

## Project structure

```
chat-app/
├── server/          Express + Socket.IO (in-memory rooms)
│   ├── index.js
│   └── test.js      Integration test (2-3 socket clients)
└── client/          React + Vite
    └── src/
        ├── useChat.js          Socket + state logic (useReducer)
        ├── App.jsx
        └── components/         JoinScreen, Sidebar, MessageList, Composer
```

## Run locally

Requires Node 18+.

```bash
# terminal 1: server (http://localhost:4000)
cd server
npm install
npm start

# terminal 2: client (http://localhost:5173)
cd client
npm install
npm run dev
```

Open the client in two browser windows and chat between them.

Run the server tests with `cd server && npm test`.

## Deploy for free

The server needs a host that supports long-lived WebSocket connections, so deploy the two part separately.

**1. Server → Render (Web Service)**
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `CLIENT_ORIGIN` = your client URL (e.g. `https://your-app.pages.dev`). Use a comma-separated list for several origins.

Free Render services sleep after inactivity, so the first connection can take a while.

**2. Client → Cloudflare Pages or Vercel**
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_SERVER_URL` = your Render server URL (no trailing slash)

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `PORT` | server | Port to listen on (default 4000) |
| `CLIENT_ORIGIN` | server | Allowed CORS origins (default `*`) |
| `VITE_SERVER_URL` | client | Socket.IO server URL (default `http://localhost:4000`) |

## Notes and next steps

Messages are stored in server memory (last 200 per room), so they reset when the server restarts. Good upgrades for a resume:

- Persist messages in PostgreSQL or MongoDB
- Add real authentication (JWT or OAuth)
- Port the client to TypeScript
- Virtualize the message list for very long histories
- Add component tests with Vitest and React Testing Library, and a GitHub Actions workflow
made by NitinMalhotra001