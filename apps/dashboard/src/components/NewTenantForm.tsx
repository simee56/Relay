import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createTenant } from "../api";

export default function NewTenantForm() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;

        setSaving(true);
        setError(null);

        try {
            const tenant = await createTenant(trimmed);
            navigate(`/tenants/${tenant.id}`); // go to the new business's page
        } catch (err) {
            setError((err as Error).message);
            setSaving(false);
        }
    }

    return (
        <div>
            <form className="inline-form" onSubmit={handleSubmit}>
                <input
                    placeholder="New business name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                />
                <button type="submit" disabled={saving || !name.trim()}>
                    {saving ? "Adding..." : "Add business"}
                </button>
            </form>
            {error && <p className="error">{error}</p>}
        </div>
    );
}