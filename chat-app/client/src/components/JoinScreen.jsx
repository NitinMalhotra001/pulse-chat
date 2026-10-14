import { useState } from "react";

export default function JoinScreen({ rooms, onJoin, error, status, initialName = "", initialRoom = "general", onCreateRoom, onLogout }) {
  const [name, setName] = useState(initialName);
  const [room, setRoom] = useState(initialRoom);
  const [roomKey, setRoomKey] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await onJoin(name.trim(), room.trim() || "general", roomKey || null);
    setBusy(false);
  };

  const selectedRoom = rooms.find(r => r.name === room);
  const isPrivateRoom = selectedRoom?.isPrivate;

  return (
    <main className="join">
      <form className="join-card" onSubmit={submit}>
        <div className="logo" aria-hidden="true">💬</div>
        <h1>Pulse Chat</h1>
        <p className="muted">Real-time rooms with end-to-end privacy.</p>

        <label>
          Display name
          <input
            autoFocus
            value={name}
            maxLength={24}
            placeholder="e.g. Nitin"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label>
          Room
          <input
            value={room}
            maxLength={24}
            placeholder="general"
            list="room-suggestions"
            onChange={(e) => setRoom(e.target.value)}
          />
          <datalist id="room-suggestions">
            {rooms.map((r) => (
              <option key={r.name} value={r.name} />
            ))}
          </datalist>
        </label>

        {isPrivateRoom && (
          <label>
            Room Key (Password)
            <input
              type="password"
              value={roomKey}
              placeholder="Enter room key"
              onChange={(e) => setRoomKey(e.target.value)}
            />
          </label>
        )}

        {rooms.length > 0 && (
          <div className="chips" aria-label="Existing rooms">
            {rooms.map((r) => (
              <button
                type="button"
                key={r.name}
                className={`chip ${room === r.name ? "active" : ""}`}
                onClick={() => setRoom(r.name)}
              >
                {r.isPrivate ? "🔒" : "#"} {r.name}
                <span className="count">{r.online}</span>
              </button>
            ))}
          </div>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button className="primary" disabled={!name.trim() || busy || status !== "connected"}>
          {status !== "connected" ? "Connecting to server…" : busy ? "Joining…" : "Join chat"}
        </button>

        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <button type="button" className="ghost" onClick={onCreateRoom} style={{ flex: 1 }}>
            Create Private Room
          </button>
          <button type="button" className="ghost" onClick={onLogout} style={{ flex: 1 }}>
            Logout
          </button>
        </div>
      </form>
    </main>
  );
}
