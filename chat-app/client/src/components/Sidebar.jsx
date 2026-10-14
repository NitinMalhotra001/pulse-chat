export default function Sidebar({ rooms, current, users, me, open, onSwitch, onLeave, onClose, onLogout }) {
  return (
    <>
      {open && <div className="scrim" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <section>
          <h2>Rooms</h2>
          <ul className="rooms">
            {rooms.map((r) => (
              <li key={r.name}>
                <button
                  className={r.name === current ? "active" : ""}
                  onClick={() => {
                    onSwitch(r.name);
                    onClose();
                  }}
                >
                  <span>{r.isPrivate ? "🔒" : "#"} {r.name}</span>
                  <span className="count">{r.online}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="grow">
          <h2>Online · {users.length}</h2>
          <ul className="users">
            {users.map((u) => (
              <li key={u.id}>
                <span className="dot" />
                {u.name}
                {u.id === me?.id && <em> (you)</em>}
              </li>
            ))}
          </ul>
        </section>

        <button className="ghost" onClick={onLeave}>
          Leave chat
        </button>
        <button className="ghost" onClick={onLogout} style={{ marginTop: "8px" }}>
          Logout
        </button>
      </aside>
    </>
  );
}
