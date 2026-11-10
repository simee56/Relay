import type { Request, Response } from "express";
import { findTenantById } from "../models/tenants";
import {
    createAgent,
    findAgentById,
    listAgentsByTenant,
    updateAgent,
} from "../models/agents";
import { isUuid } from "../utils";

type AgentFields = { name?: string; systemPrompt?: string; voice?: string };
type FieldsResult = { ok: true; value: AgentFields } | { ok: false; error: string };

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

export async function listTenantAgents(req: Request, res: Response) {
    const tenantId = String(req.params.tenantId);

    if (!isUuid(tenantId)) {
        res.status(400).json({ error: "tenantId is not a valid id" });
        return;
    }

    try {
        const tenant = await findTenantById(tenantId);
        if (!tenant) {
        res.status(404).json({ error: "Business not found" });
        return;
        }
        res.json(await listAgentsByTenant(tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not load agents" });
    }
}

export async function createTenantAgent(req: Request, res: Response) {
    const tenantId = String(req.params.tenantId);

    if (!isUuid(tenantId)) {
        res.status(400).json({ error: "tenantId is not a valid id" });
        return;
    }

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
        const tenant = await findTenantById(tenantId);
        if (!tenant) {
        res.status(404).json({ error: "Business not found" });
        return;
        }
        const agent = await createAgent(tenantId, name, systemPrompt, voice);
        res.status(201).json(agent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not create agent" });
    }
}

export async function getAgent(req: Request, res: Response) {
    const agentId = String(req.params.agentId);

    if (!isUuid(agentId)) {
        res.status(400).json({ error: "agentId is not a valid id" });
        return;
    }

    try {
        const agent = await findAgentById(agentId);
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

export async function patchAgent(req: Request, res: Response) {
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
        const agent = await updateAgent(agentId, fields.value);
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