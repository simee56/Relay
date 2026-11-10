import { pool } from "../db";

export type AgentRecord = {
    id: string;
    tenant_id: string;
    name: string;
    system_prompt: string;
    voice: string;
    created_at: Date;
};

const DEFAULT_VOICE = "hannah";

export async function listAgentsByTenant(tenantId: string): Promise<AgentRecord[]> {
    const result = await pool.query<AgentRecord>(
        `SELECT id, tenant_id, name, system_prompt, voice, created_at
     FROM agents
     WHERE tenant_id = $1
     ORDER BY created_at`,
        [tenantId]
    );
    return result.rows;
}

export async function createAgent(
    tenantId: string,
    name: string,
    systemPrompt: string,
    voice?: string
): Promise<AgentRecord> {
    const result = await pool.query<AgentRecord>(
        `INSERT INTO agents (tenant_id, name, system_prompt, voice)
     VALUES ($1, $2, $3, $4)
     RETURNING id, tenant_id, name, system_prompt, voice, created_at`,
        [tenantId, name, systemPrompt, voice ?? DEFAULT_VOICE]
    );
    return result.rows[0];
}