const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export const ENGINE_URL = import.meta.env.VITE_ENGINE_URL ?? "http://localhost:3000";

export type User = { id: string; email: string };
export type Business = { id: string; name: string };
export type Me = { user: User; tenant: Business };

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

export type NewAgent = {
  name: string;
  system_prompt: string;
  voice?: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  business_name: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include", 
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

export const register = (input: SignUpInput) =>
  request<Me>("/auth/register", { method: "POST", body: JSON.stringify(input) });

export const login = (email: string, password: string) =>
  request<Me>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const logout = () => request<{ ok: boolean }>("/auth/logout", { method: "POST" });

export const getMe = () => request<Me>("/auth/me");

export const getAgents = () => request<Agent[]>("/agents");

export const createAgent = (agent: NewAgent) =>
  request<Agent>("/agents", { method: "POST", body: JSON.stringify(agent) });

export const updateAgent = (agentId: string, changes: AgentChanges) =>
  request<Agent>(`/agents/${agentId}`, { method: "PATCH", body: JSON.stringify(changes) });