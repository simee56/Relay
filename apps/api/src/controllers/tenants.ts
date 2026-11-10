import type { Request, Response } from "express";
import { createTenant, findTenantById, listTenants } from "../models/tenants";
import { uniqueViolationConstraint, isUuid } from "../utils";

export async function getTenants(_req: Request, res: Response) {
  try {
    const tenants = await listTenants();
    res.json(tenants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load tenants" });
  }
}

export async function getTenant(req: Request, res: Response) {
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
    res.json(tenant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load business" });
  }
}

export async function addTenant(req: Request, res: Response) {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (!name || name.length > 100) {
    res.status(400).json({ error: "name is required (1 to 100 characters)" });
    return;
  }

  try {
    const tenant = await createTenant(name);
    res.status(201).json(tenant);
  } catch (err) {
    if (uniqueViolationConstraint(err)) {
      res.status(409).json({ error: "A business with that name already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Could not create tenant" });
  }
}