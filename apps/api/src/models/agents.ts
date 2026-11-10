import { pool } from "../db";

export type AgentRecord = {
    id: string;
    tenant_id: string;
    name: string;
    system_prompt: string;
    voice: string;
    created_at: Date;
};

const AGENT_COLUMNS = "id, tenant_id, name, system_prompt, voice, created_at";
const DEFAULT_VOICE = "hannah";

export async function listAgentsByTenant(tenantId: string): Promise<AgentRecord[]> {
    const result = await pool.query<AgentRecord>(
        `SELECT ${AGENT_COLUMNS} FROM agents WHERE tenant_id = $1 ORDER BY created_at`,
        [tenantId]
    );
    return result.rows;
}

export async function findAgentById(id: string): Promise<AgentRecord | null> {
    const result = await pool.query<AgentRecord>(
        `SELECT ${AGENT_COLUMNS} FROM agents WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
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

export type AgentChanges = {
    name?: string;
    systemPrompt?: string;
    voice?: string;
}

export async function updateAgent(
    id: string,
    changes: AgentChanges
): Promise<AgentRecord | null> {
    const result = await pool.query<AgentRecord>(
        `UPDATE agents
        SET name          = COALESCE($2, name),
        system_prompt = COALESCE($3, system_prompt),
        voice         = COALESCE($4, voice)
        WHERE id = $1
        RETURNING ${AGENT_COLUMNS}`,
        [id, changes.name ?? null, changes.systemPrompt ?? null, changes.voice ?? null]
    );
    return result.rows[0] ?? null;
}