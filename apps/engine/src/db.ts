import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Add it to your .env file.");
}

export const pool = new Pool({ connectionString, max: 5 });

export type Agent = {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  systemPrompt: string;
  voice: string;
};

type AgentRow = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  system_prompt: string;
  voice: string;
};

const AGENT_SELECT = `
  SELECT a.id, a.tenant_id, t.name AS tenant_name, a.name, a.system_prompt, a.voice
  FROM agents a
  JOIN tenants t ON t.id = a.tenant_id
`;

function toAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    name: row.name,
    systemPrompt: row.system_prompt,
    voice: row.voice,
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getDefaultAgent(): Promise<Agent | null> {
  const result = await pool.query<AgentRow>(
    `${AGENT_SELECT} ORDER BY a.created_at ASC LIMIT 1`
  );
  return result.rows[0] ? toAgent(result.rows[0]) : null;
}

export async function getAgentById(id: string): Promise<Agent | null> {
  if (!UUID_PATTERN.test(id)) return null; // not even shaped like an id
  const result = await pool.query<AgentRow>(`${AGENT_SELECT} WHERE a.id = $1`, [id]);
  return result.rows[0] ? toAgent(result.rows[0]) : null;
}