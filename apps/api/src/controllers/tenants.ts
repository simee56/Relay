import type { Request, Response } from "express";
import { listTenants } from "../models/tenants";

export async function getTenants(_req: Request, res: Response) {
  try {
    const tenants = await listTenants();
    res.json(tenants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load tenants" });
  }
}