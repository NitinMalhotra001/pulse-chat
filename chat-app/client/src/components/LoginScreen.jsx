import { useState } from "react";

export default function LoginScreen({ onLogin, onSignup, error, status }) {
  const [tab, setTab] = useState("login"); // "login" or "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || busy) return;
    setBusy(true);
    await onLogin(username.trim(), password.trim());
    setBusy(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !confirmPassword.trim() || busy) return;

    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    if (password.length < 3) {
      alert("Password must be at least 3 characters!");
      return;
    }

    setBusy(true);
    const success = await onSignup(username.trim(), password.trim());
    setBusy(false);

    if (success) {
      // Auto-switch to login tab after successful signup
      alert("Account created successfully! Please login with your credentials.");
      setTab("login");
      setConfirmPassword("");
    }
  };

  const isLoginTab = tab === "login";

  return (
    <main className="join">
      <form className="join-card" onSubmit={isLoginTab ? handleLogin : handleSignup}>
        <div className="logo" aria-hidden="true">🔐</div>
        <h1>Pulse Chat</h1>
        <p className="muted">Secure messaging with private rooms.</p>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`tab ${isLoginTab ? "active" : ""}`}
            onClick={() => {
              setTab("login");
              setConfirmPassword("");
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`tab ${!isLoginTab ? "active" : ""}`}
            onClick={() => {
              setTab("signup");
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Login Form */}
        {isLoginTab && (
          <>
            <label>
              Username
              <input
                autoFocus
                type="text"
                value={username}
                maxLength={24}
                placeholder="Enter your username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                minLength={3}
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <p className="error" role="alert">{error}</p>}

            <button className="primary" disabled={!username.trim() || !password.trim() || busy || status !== "connected"}>
              {status !== "connected" ? "Connecting to server…" : busy ? "Logging in…" : "Login"}
            </button>

            <p className="muted" style={{ fontSize: "12px", marginTop: "8px", textAlign: "center" }}>
              🔒 Use credentials from your account
            </p>
          </>
        )}

        {/* Signup Form */}
        {!isLoginTab && (
          <>
            <label>
              Create Username
              <input
                autoFocus
                type="text"
                value={username}
                maxLength={24}
                placeholder="Choose a unique username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label>
              Create Password
              <input
                type="password"
                value={password}
                minLength={3}
                placeholder="Min 3 characters"
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                minLength={3}
                placeholder="Re-enter your password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            {error && <p className="error" role="alert">{error}</p>}

            <button className="primary" disabled={!username.trim() || !password.trim() || !confirmPassword.trim() || busy || status !== "connected"}>
              {status !== "connected" ? "Connecting to server…" : busy ? "Creating Account…" : "Create Account"}
            </button>

            <p className="muted" style={{ fontSize: "12px", marginTop: "8px", textAlign: "center" }}>
              ✨ After signup, login with your credentials
            </p>
          </>
        )}
      </form>
    </main>
  );
}
