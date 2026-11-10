import { Router } from "express";
import authRoutes from "./auth";
import tenantRoutes from "./tenants";
import agentRoutes from "./agents";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);
router.use("/agents", agentRoutes);

export default router;