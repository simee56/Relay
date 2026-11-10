import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAgents, getTenant, type Agent, type Tenant } from "../api";
import AgentEditor from "../components/AgentEditor";

export default function TenantPage() {
    const { tenantId } = useParams<{ tenantId: string }>();

    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenantId) return;
        setLoading(true);
        setError(null);

        // Ask for the business and its agents at the same time
        Promise.all([getTenant(tenantId), getAgents(tenantId)])
            .then(([tenantData, agentData]) => {
                setTenant(tenantData);
                setAgents(agentData);
            })
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, [tenantId]);

    // Called by an editor after a successful save, so our list shows the new version
    function handleSaved(updated: Agent) {
        setAgents((current) => current.map((a) => (a.id === updated.id ? updated : a)));
    }

    return (
        <div>
            <p>
                <Link to="/">← All businesses</Link>
            </p>

            {loading && <p>Loading...</p>}
            {error && <p className="error">Could not load this business: {error}</p>}

            {tenant && (
                <>
                    <h2>{tenant.name}</h2>
                    <p className="muted">Agents</p>

                    {agents.length === 0 && <p>No agents yet.</p>}

                    {agents.map((agent) => (
                        <AgentEditor key={agent.id} agent={agent} onSaved={handleSaved} />
                    ))}
                </>
            )}
        </div>
    );
}