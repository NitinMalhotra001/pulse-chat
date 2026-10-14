import { useState } from "react";
import { useChat } from "./useChat.js";
import LoginScreen from "./components/LoginScreen.jsx";
import JoinScreen from "./components/JoinScreen.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MessageList from "./components/MessageList.jsx";
import Composer from "./components/Composer.jsx";
import CreateRoomModal from "./components/CreateRoomModal.jsx";

export default function App() {
  const { state, join, leave, send, sendFile, retry, notifyTyping, loadOlder, savedSession, login, signup, logout, createPrivateRoom } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { status, joined, authenticated, me, room, rooms, users, messages, hasMore, typers, error } = state;

  // Show login screen if not authenticated
  if (!authenticated) {
    return <LoginScreen onLogin={login} onSignup={signup} error={error} status={status} />;
  }

  // Show join screen if authenticated but not joined a room
  if (!joined) {
    const saved = savedSession();
    return (
      <>
        <JoinScreen
          rooms={rooms}
          onJoin={join}
          error={error}
          status={status}
          initialName={saved?.name}
          initialRoom={saved?.room}
          onCreateRoom={() => setCreateModalOpen(true)}
          onLogout={logout}
        />
        {createModalOpen && (
          <CreateRoomModal
            onClose={() => setCreateModalOpen(false)}
            onCreate={createPrivateRoom}
            error={error}
          />
        )}
      </>
    );
  }

  const offline = status !== "connected";

  return (
    <div className="app">
      <Sidebar
        rooms={rooms}
        current={room}
        users={users}
        me={me}
        open={menuOpen}
        onSwitch={(r) => r !== room && join(me.name, r)}
        onLeave={leave}
        onClose={() => setMenuOpen(false)}
        onLogout={logout}
      />

      <section className="chat">
        <header className="topbar">
          <button className="menu" onClick={() => setMenuOpen(true)} aria-label="Open rooms">
            ☰
          </button>
          <h1># {room}</h1>
          <span className={`status ${status}`}>
            {status === "connected" ? "Live" : status === "connecting" ? "Connecting…" : "Offline"}
          </span>
        </header>

        {offline && (
          <div className="banner" role="status">
            Connection lost. Trying to reconnect — your messages will be sent when you're back.
          </div>
        )}

        <MessageList
          roomKey={room}
          messages={messages}
          me={me}
          hasMore={hasMore}
          typers={typers}
          onLoadOlder={loadOlder}
          onRetry={retry}
        />

        <Composer room={room} disabled={offline} onSend={send} onFileUpload={sendFile} onTyping={notifyTyping} />
      </section>
    </div>
  );
}
