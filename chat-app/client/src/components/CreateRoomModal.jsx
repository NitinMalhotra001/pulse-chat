import { useState } from "react";

export default function CreateRoomModal({ onClose, onCreate, error }) {
  const [roomName, setRoomName] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!roomName.trim() || !roomKey.trim() || busy) return;
    setBusy(true);
    const success = await onCreate(roomName.trim(), roomKey.trim());
    setBusy(false);
    if (success) onClose();
  };

  return (
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal">
        <form onSubmit={submit}>
          <h2>Create Private Room</h2>
          <p className="muted">Set a room name and key. Share the key with people you want to invite.</p>

          <label>
            Room Name
            <input
              autoFocus
              value={roomName}
              maxLength={24}
              placeholder="e.g. my-team"
              onChange={(e) => setRoomName(e.target.value)}
            />
          </label>

          <label>
            Room Key (Password)
            <input
              type="password"
              value={roomKey}
              minLength={3}
              placeholder="Min 3 characters"
              onChange={(e) => setRoomKey(e.target.value)}
            />
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={!roomName.trim() || !roomKey.trim() || busy}>
              {busy ? "Creating…" : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
