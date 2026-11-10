import { Router } from "express";
import { getAgent, patchAgent } from "../controllers/agents";

const router = Router();

router.get("/:agentId", getAgent);
router.patch("/:agentId", patchAgent);

export default router;