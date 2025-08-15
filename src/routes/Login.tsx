import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiAuthStatus, apiLogin, apiRegister } from "@/lib/api";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    apiAuthStatus()
      .then(({ initialized }) => {
        setInitialized(initialized);
        if (!initialized) setMode("register"); // bootstrap first user
      })
      .catch(() => setInitialized(true));
  }, []);

  const onSubmit = async () => {
    setErr("");
    setBusy(true);
    try {
      if (mode === "register") {
        const { token } = await apiRegister(username.trim(), password);
        sessionStorage.setItem("token", token);
      } else {
        const { token } = await apiLogin(username.trim(), password);
        sessionStorage.setItem("token", token);
      }
      sessionStorage.setItem("loggedIn", "1");
      const dest = (loc.state as any)?.from?.pathname || "/";
      nav(dest, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>{mode === "register" ? "Create Admin" : "Login"}</h2>
      {initialized === false && (
        <div style={{ background: "#eef8ee", padding: 8, marginBottom: 8 }}>
          First-time setup: create your admin account.
        </div>
      )}
      <label>
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", padding: 10, fontSize: 16 }}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, fontSize: 16 }}
        />
      </label>
      {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
      <button
        onClick={onSubmit}
        disabled={busy || !username || !password}
        style={{ marginTop: 12, width: "100%", padding: 12, fontSize: 18 }}
      >
        {busy ? "Please wait…" : mode === "register" ? "Create Admin" : "Login"}
      </button>

      <div style={{ marginTop: 12, textAlign: "center" }}>
        <button
          onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
          style={{ padding: 8 }}
        >
          {mode === "login"
            ? "First time? Create admin"
            : "Have an account? Login"}
        </button>
      </div>
    </div>
  );
}
