import type { Request, Response } from "express";
import {
    createAgent,
    findAgentById,
    listAgentsByTenant,
    updateAgent,
} from "../models/agents";
import { getAuth } from "../middleware/auth";
import { isUuid } from "../utils";

type AgentFields = { name?: string; systemPrompt?: string; voice?: string };
type FieldsResult = { ok: true; value: AgentFields } | { ok: false; error: string };

// Checks the agent fields in a request body. A field that was not sent is skipped.
function readAgentFields(body: unknown): FieldsResult {
    const b = (body ?? {}) as Record<string, unknown>;
    const value: AgentFields = {};

    if (b.name !== undefined) {
        const name = typeof b.name === "string" ? b.name.trim() : "";
        if (!name || name.length > 100) {
            return { ok: false, error: "name must be 1 to 100 characters" };
        }
        value.name = name;
    }

    if (b.system_prompt !== undefined) {
        const prompt = typeof b.system_prompt === "string" ? b.system_prompt.trim() : "";
        if (!prompt || prompt.length > 4000) {
            return { ok: false, error: "system_prompt must be 1 to 4000 characters" };
        }
        value.systemPrompt = prompt;
    }

    if (b.voice !== undefined) {
        const voice = typeof b.voice === "string" ? b.voice.trim() : "";
        if (!voice || voice.length > 50) {
            return { ok: false, error: "voice must be 1 to 50 characters" };
        }
        value.voice = voice;
    }

    return { ok: true, value };
}

// GET /agents : the agents of the logged-in business
export async function listMyAgents(_req: Request, res: Response) {
    const { tenantId } = getAuth(res); // from the signed token, never from the request

    try {
        res.json(await listAgentsByTenant(tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not load agents" });
    }
}

// POST /agents : creates an agent in the logged-in business
export async function createMyAgent(req: Request, res: Response) {
    const { tenantId } = getAuth(res);

    const fields = readAgentFields(req.body);
    if (!fields.ok) {
        res.status(400).json({ error: fields.error });
        return;
    }

    const { name, systemPrompt, voice } = fields.value;
    if (!name || !systemPrompt) {
        res.status(400).json({ error: "name and system_prompt are required" });
        return;
    }

    try {
        const agent = await createAgent(tenantId, name, systemPrompt, voice);
        res.status(201).json(agent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not create agent" });
    }
}

// GET /agents/:agentId
export async function getAgent(req: Request, res: Response) {
    const { tenantId } = getAuth(res);
    const agentId = String(req.params.agentId);

    if (!isUuid(agentId)) {
        res.status(400).json({ error: "agentId is not a valid id" });
        return;
    }

    try {
        const agent = await findAgentById(agentId, tenantId);
        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }
        res.json(agent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not load agent" });
    }
}

// PATCH /agents/:agentId
export async function patchAgent(req: Request, res: Response) {
    const { tenantId } = getAuth(res);
    const agentId = String(req.params.agentId);

    if (!isUuid(agentId)) {
        res.status(400).json({ error: "agentId is not a valid id" });
        return;
    }

    const fields = readAgentFields(req.body);
    if (!fields.ok) {
        res.status(400).json({ error: fields.error });
        return;
    }

    if (Object.keys(fields.value).length === 0) {
        res.status(400).json({ error: "send at least one of: name, system_prompt, voice" });
        return;
    }

    try {
        const agent = await updateAgent(agentId, tenantId, fields.value);
        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }
        res.json(agent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not update agent" });
    }
}