import type { Request, Response } from "express";
import { findTenantById } from "../models/tenants";
import { createAgent, listAgentsByTenant } from "../models/agents";
import { isUuid } from "../utils";

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

    const body = req.body ?? {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const systemPrompt = typeof body.system_prompt === "string" ? body.system_prompt.trim() : "";
    const voice = typeof body.voice === "string" ? body.voice.trim() : undefined;

    if (!name || name.length > 100) {
        res.status(400).json({ error: "name is required (1 to 100 characters)" });
        return;
    }
    if (!systemPrompt || systemPrompt.length > 4000) {
        res.status(400).json({ error: "system_prompt is required (1 to 4000 characters)" });
        return;
    }
    if (voice !== undefined && (voice.length === 0 || voice.length > 50)) {
        res.status(400).json({ error: "voice must be 1 to 50 characters if given" });
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