import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import FileMessage from "./FileMessage.jsx";

const NEAR_BOTTOM_PX = 120;

const timeFmt = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" });

const colorFor = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 70%)`;
};

const Message = memo(function Message({ m, mine, grouped, onRetry }) {
  // Handle file messages
  if (m.type === "file" && m.file) {
    return <FileMessage file={m.file} mine={mine} onRetry={onRetry} />;
  }

  // Handle system messages
  if (m.system) {
    return <div className="system">{m.text}</div>;
  }

  // Handle text messages
  return (
    <div className={`msg ${mine ? "mine" : ""} ${grouped ? "grouped" : ""}`}>
      {!grouped && !mine && (
        <div className="author" style={{ color: colorFor(m.name) }}>
          {m.name}
        </div>
      )}
      <div className={`bubble ${m.pending ? "pending" : ""} ${m.failed ? "failed" : ""}`}>
        <span className="text">{m.text}</span>
        <span className="meta">
          {m.failed ? (
            <button className="retry" onClick={() => onRetry(m)}>
              Failed · Retry
            </button>
          ) : m.pending ? (
            "Sending…"
          ) : (
            timeFmt.format(m.ts)
          )}
        </span>
      </div>
    </div>
  );
});

export default function MessageList({ messages, me, hasMore, onLoadOlder, onRetry, typers, roomKey }) {
  const scroller = useRef(null);
  const stick = useRef(true); // auto-scroll only while user is near the bottom
  const prevHeight = useRef(0);
  const prevCount = useRef(0);
  const prevFirstId = useRef(null);
  const [showJump, setShowJump] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // New room → jump to the bottom
  useEffect(() => {
    stick.current = true;
    prevFirstId.current = null;
  }, [roomKey]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const firstId = messages[0]?.id ?? null;
    const prependedOlder =
      prevFirstId.current !== null && firstId !== prevFirstId.current && messages.length > prevCount.current &&
      el.scrollTop < 80;

    if (prependedOlder) {
      // Keep the viewport anchored after older messages are inserted above
      el.scrollTop = el.scrollHeight - prevHeight.current + el.scrollTop;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    } else if (messages.length > prevCount.current) {
      setShowJump(true);
    }
    prevFirstId.current = firstId;
    prevCount.current = messages.length;
    prevHeight.current = el.scrollHeight;
  }, [messages, typers]);

  const onScroll = async () => {
    const el = scroller.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distance < NEAR_BOTTOM_PX;
    if (stick.current) setShowJump(false);

    if (el.scrollTop < 60 && hasMore && !loadingOlder) {
      prevHeight.current = el.scrollHeight;
      setLoadingOlder(true);
      await onLoadOlder();
      setLoadingOlder(false);
    }
  };

  const jump = () => {
    const el = scroller.current;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowJump(false);
  };

  const names = Object.values(typers);
  const typingText =
    names.length === 0
      ? ""
      : names.length === 1
        ? `${names[0]} is typing…`
        : names.length === 2
          ? `${names[0]} and ${names[1]} are typing…`
          : "Several people are typing…";

  return (
    <div className="list-wrap">
      <div className="list" ref={scroller} onScroll={onScroll} role="log" aria-live="polite">
        {loadingOlder && <div className="system">Loading earlier messages…</div>}
        {!hasMore && messages.length > 0 && <div className="system">Start of the conversation</div>}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = !!prev && !prev.system && !m.system && prev.userId === m.userId && m.ts - prev.ts < 60000;
          return (
            <Message key={m.clientId || m.id} m={m} mine={m.userId === me?.id} grouped={grouped} onRetry={onRetry} />
          );
        })}
      </div>
      <div className="typing" aria-live="polite">{typingText}</div>
      {showJump && (
        <button className="jump" onClick={jump}>
          New messages ↓
        </button>
      )}
    </div>
  );
}
