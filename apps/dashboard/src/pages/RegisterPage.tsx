import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/context";

export default function RegisterPage() {
    const { me, loading, signUp } = useAuth();
    const [businessName, setBusinessName] = useState("");
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
            await signUp({
                business_name: businessName.trim(),
                email: email.trim(),
                password,
            });
        } catch (err) {
            setError((err as Error).message);
            setSaving(false);
        }
    }

    return (
        <form className="card auth-form" onSubmit={handleSubmit}>
            <h2>Create your account</h2>

            <label htmlFor="reg-business">Business name</label>
            <input
                id="reg-business"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                maxLength={100}
                required
            />

            <label htmlFor="reg-email">Email</label>
            <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />

            <label htmlFor="reg-password">Password</label>
            <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
            />
            <div className="muted">8 to 72 characters</div>

            <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={saving}>
                    {saving ? "Creating..." : "Create account"}
                </button>
            </div>

            {error && <p className="error">{error}</p>}

            <p className="muted">
                Already have an account? <Link to="/login">Log in</Link>
            </p>
        </form>
    );
}