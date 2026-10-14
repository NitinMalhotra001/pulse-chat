// Integration test: spawns the server and drives it with two socket clients.
import { spawn } from "child_process";
import { io as connect } from "socket.io-client";
import assert from "assert";

const PORT = 4555;
const url = `http://localhost:${PORT}`;

const server = spawn("node", ["index.js"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "inherit"],
});

const ready = new Promise((resolve) =>
  server.stdout.on("data", (d) => String(d).includes("listening") && resolve())
);

const emit = (sock, ev, payload) =>
  new Promise((res) => sock.emit(ev, payload, res));
const once = (sock, ev, pred = () => true) =>
  new Promise((res) => {
    const h = (data) => {
      if (pred(data)) {
        sock.off(ev, h);
        res(data);
      }
    };
    sock.on(ev, h);
  });

async function run() {
  await ready;
  const a = connect(url);
  const b = connect(url);
  await Promise.all([once(a, "connect"), once(b, "connect")]);

  // join
  const ja = await emit(a, "join", { name: "Alice", room: "general" });
  assert.ok(ja.ok, "alice joins");
  assert.equal(ja.room, "general");
  console.log("ok  alice joined");

  const presenceSeen = once(a, "presence", (u) => u.length === 2);
  const jb = await emit(b, "join", { name: "Bob", room: "general" });
  assert.ok(jb.ok, "bob joins");
  assert.equal(jb.users.length, 2);
  await presenceSeen;
  console.log("ok  presence updates (2 users)");

  // validation
  const bad = await emit(a, "join", { name: "   ", room: "general" });
  assert.equal(bad.ok, false);
  console.log("ok  empty name rejected");

  // message delivery + clientId reconcile
  const got = once(b, "message", (m) => !m.system && m.text === "hello bob");
  const ack = await emit(a, "message", { text: "hello bob", clientId: "c-1" });
  assert.ok(ack.ok);
  const m = await got;
  assert.equal(m.name, "Alice");
  assert.equal(m.clientId, "c-1");
  console.log("ok  message delivered with clientId");

  // empty message rejected
  const empty = await emit(a, "message", { text: "   ", clientId: "c-2" });
  assert.equal(empty.ok, false);
  console.log("ok  empty message rejected");

  // typing indicator reaches the other user only
  const typing = once(b, "typing", (t) => t.typing === true);
  a.emit("typing", true);
  const t = await typing;
  assert.equal(t.name, "Alice");
  console.log("ok  typing indicator");

  // room switch isolates messages
  await emit(b, "join", { name: "Bob", room: "random" });
  let leaked = false;
  b.on("message", (m) => m.text === "only general" && (leaked = true));
  await emit(a, "message", { text: "only general", clientId: "c-3" });
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(leaked, false);
  console.log("ok  rooms are isolated");

  // history pagination
  for (let i = 0; i < 40; i++) {
    await emit(a, "message", { text: `msg ${i}`, clientId: `h-${i}` });
  }
  const c = connect(url);
  await once(c, "connect");
  const jc = await emit(c, "join", { name: "Carol", room: "general" });
  assert.equal(jc.messages.length, 30);
  assert.equal(jc.hasMore, true);
  const older = await emit(c, "history", { room: "general", before: jc.messages[0].id });
  assert.ok(older.ok && older.messages.length > 0);
  assert.ok(older.messages[older.messages.length - 1].ts <= jc.messages[0].ts);
  console.log("ok  history pagination");

  // disconnect updates presence
  const left = once(a, "presence", (u) => !u.find((x) => x.name === "Carol"));
  c.close();
  await left;
  console.log("ok  disconnect removes user from presence");

  a.close();
  b.close();
}

run()
  .then(() => {
    console.log("\nALL TESTS PASSED");
    server.kill();
    process.exit(0);
  })
  .catch((e) => {
    console.error("\nTEST FAILED:", e);
    server.kill();
    process.exit(1);
  });

setTimeout(() => {
  console.error("TIMEOUT");
  server.kill();
  process.exit(1);
}, 20000);
