import { useEffect, useState } from "react";
import { getAgents, type Agent } from "../api";
import { useAuth } from "../auth/context";
import AgentEditor from "../components/AgentEditor";
import NewAgentForm from "../components/NewAgentForm";

export default function AgentsPage() {
    const { me, signOut } = useAuth();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getAgents()
            .then(setAgents)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    function handleSaved(updated: Agent) {
        setAgents((current) => current.map((a) => (a.id === updated.id ? updated : a)));
    }

    function handleCreated(created: Agent) {
        setAgents((current) => [...current, created]);
    }

    if (!me) return null; // RequireAuth makes sure this never happens

    return (
        <div>
            <div className="row">
                <div>
                    <h2 style={{ margin: 0 }}>{me.tenant.name}</h2>
                    <span className="muted">{me.user.email}</span>
                </div>
                <button className="secondary" onClick={() => void signOut()}>
                    Log out
                </button>
            </div>

            <p className="muted">Agents</p>

            {loading && <p>Loading...</p>}
            {error && <p className="error">Could not load agents: {error}</p>}
            {!loading && !error && agents.length === 0 && <p>No agents yet.</p>}

            {agents.map((agent) => (
                <AgentEditor key={agent.id} agent={agent} onSaved={handleSaved} />
            ))}

            <NewAgentForm businessName={me.tenant.name} onCreated={handleCreated} />
        </div>
    );
}