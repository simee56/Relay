import { Router } from "express";
import { createMyAgent, getAgent, listMyAgents, patchAgent } from "../controllers/agents";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Every route below needs a logged-in user
router.use(requireAuth);

router.get("/", listMyAgents);
router.post("/", createMyAgent);
router.get("/:agentId", getAgent);
router.patch("/:agentId", patchAgent);

export default router;