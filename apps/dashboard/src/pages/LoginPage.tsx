import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/context";

export default function LoginPage() {
  const { me, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && me) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form className="card auth-form" onSubmit={handleSubmit}>
      <h2>Log in</h2>

      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={saving}>
          {saving ? "Logging in..." : "Log in"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </form>
  );
}