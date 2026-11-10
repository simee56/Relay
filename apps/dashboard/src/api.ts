const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export const ENGINE_URL = import.meta.env.VITE_ENGINE_URL ?? "http://localhost:3000";

export type Tenant = {
    id: string;
    name: string;
    created_at: string;
};

export type Agent = {
    id: string;
    tenant_id: string;
    name: string;
    system_prompt: string;
    voice: string;
    created_at: string;
};

export type AgentChanges = {
    name?: string;
    system_prompt?: string;
    voice?: string;
};

// One helper for every request: adds the base address, reads the JSON,
// and turns an error reply into a normal JavaScript error with the API's message
async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });

    if (!res.ok) {
        let message = `API error ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) message = body.error;
        } catch {
            // the reply had no JSON, keep the default message
        }
        throw new Error(message);
    }

    return res.json() as Promise<T>;
}

export const getTenants = () => request<Tenant[]>("/tenants");

export const getTenant = (tenantId: string) => request<Tenant>(`/tenants/${tenantId}`);

export const getAgents = (tenantId: string) =>
    request<Agent[]>(`/tenants/${tenantId}/agents`);

export const updateAgent = (agentId: string, changes: AgentChanges) =>
    request<Agent>(`/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
    }
    );

export type NewAgent = {
    name: string;
    system_prompt: string;
    voice?: string;
};

export const createTenant = (name: string) =>
    request<Tenant>("/tenants", {
        method: "POST",
        body: JSON.stringify({ name }),
    }
);

export const createAgent = (tenantId: string, agent: NewAgent) =>
    request<Agent>(`/tenants/${tenantId}/agents`, {
        method: "POST",
        body: JSON.stringify(agent),
    }
);