import { Router } from "express";
import { getTenants } from "../controllers/tenants";

const router = Router();

router.get("/", getTenants);

export default router;