import { Router } from "express";
import authRoutes from "./auth";
import agentRoutes from "./agents";
import documentRoutes from "./documents";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/auth", authRoutes);
router.use("/agents", agentRoutes);
router.use("/documents", documentRoutes);

export default router;