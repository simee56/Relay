import { Router } from "express";
import tenantRoutes from "./tenants";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/tenants", tenantRoutes);

export default router;