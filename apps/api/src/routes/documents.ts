import { Router } from "express";
import {
    addDocument,
    getDocument,
    listMyDocuments,
    removeDocument,
} from "../controllers/documents";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", listMyDocuments);
router.post("/", addDocument);
router.get("/:documentId", getDocument);
router.delete("/:documentId", removeDocument);

export default router;