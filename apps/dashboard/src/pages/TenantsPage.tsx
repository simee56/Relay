import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTenants, type Tenant } from "../api";
import NewTenantForm from "../components/NewTenantForm";

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getTenants()
            .then(setTenants)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <NewTenantForm />

            <p className="muted">Your businesses</p>

            {loading && <p>Loading...</p>}
            {error && <p className="error">Could not load businesses: {error}</p>}

            {tenants.map((tenant) => (
                <Link className="card" key={tenant.id} to={`/tenants/${tenant.id}`}>
                    <strong>{tenant.name}</strong>
                    <div className="muted">
                        Created {new Date(tenant.created_at).toLocaleDateString()}
                    </div>
                </Link>
            ))}
        </div>
    );
}