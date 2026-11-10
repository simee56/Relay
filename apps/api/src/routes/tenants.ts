import { Router } from "express";
import { addTenant, getTenant, getTenants } from "../controllers/tenants";
import { createTenantAgent, listTenantAgents } from "../controllers/agents";

const router = Router();

router.get("/", getTenants);
router.post("/", addTenant);

router.get("/:tenantId", getTenant);

router.get("/:tenantId/agents", listTenantAgents);
router.post("/:tenantId/agents", createTenantAgent);

export default router;