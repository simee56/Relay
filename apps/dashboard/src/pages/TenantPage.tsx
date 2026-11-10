import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAgents, getTenant, type Agent, type Tenant } from "../api";
import AgentEditor from "../components/AgentEditor";
import NewAgentForm from "../components/NewAgentForm";

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

        Promise.all([getTenant(tenantId), getAgents(tenantId)])
            .then(([tenantData, agentData]) => {
                setTenant(tenantData);
                setAgents(agentData);
            })
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, [tenantId]);

    function handleSaved(updated: Agent) {
        setAgents((current) => current.map((a) => (a.id === updated.id ? updated : a)));
    }

    function handleCreated(created: Agent) {
        setAgents((current) => [...current, created]);
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

                    <NewAgentForm
                        tenantId={tenant.id}
                        tenantName={tenant.name}
                        onCreated={handleCreated}
                    />
                </>
            )}
        </div>
    );
}