import type { Request, Response } from "express";
import {
    createDocument,
    deleteDocument,
    findDocument,
    listDocuments,
    markQueued,
} from "../models/documents";
import { enqueueDocument } from "../queue";
import { getAuth } from "../middleware/auth";
import { isUuid } from "../utils";

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 100_000; 

export async function listMyDocuments(_req: Request, res: Response) {
    const { tenantId } = getAuth(res);

    try {
        res.json(await listDocuments(tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not load documents" });
    }
}

export async function addDocument(req: Request, res: Response) {
    const { tenantId } = getAuth(res);
    const body = (req.body ?? {}) as Record<string, unknown>;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!title || title.length > MAX_TITLE_LENGTH) {
        res.status(400).json({ error: `title is required (1 to ${MAX_TITLE_LENGTH} characters)` });
        return;
    }
    if (!content || content.length > MAX_CONTENT_LENGTH) {
        res.status(400).json({ error: `content is required (1 to ${MAX_CONTENT_LENGTH} characters)` });
        return;
    }

    try {
        const document = await createDocument(tenantId, title, content);

        try {
            await enqueueDocument(document.id, tenantId);
        } catch (err) {
            console.error(
                `[queue] could not add the job for document ${document.id} (it stays "queued" and can be retried):`,
                (err as Error).message
            );
        }

        res.status(201).json(document);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not save the document" });
    }
}

export async function getDocument(req: Request, res: Response) {
    const { tenantId } = getAuth(res);
    const documentId = String(req.params.documentId);

    if (!isUuid(documentId)) {
        res.status(400).json({ error: "documentId is not a valid id" });
        return;
    }

    try {
        const document = await findDocument(documentId, tenantId);
        if (!document) {
            res.status(404).json({ error: "Document not found" });
            return;
        }
        res.json(document);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not load the document" });
    }
}

// POST /documents/:documentId/retry : add the job again for a stuck or failed document
export async function retryDocument(req: Request, res: Response) {
    const { tenantId } = getAuth(res);
    const documentId = String(req.params.documentId);

    if (!isUuid(documentId)) {
        res.status(400).json({ error: "documentId is not a valid id" });
        return;
    }

    try {
        const document = await findDocument(documentId, tenantId);
        if (!document) {
            res.status(404).json({ error: "Document not found" });
            return;
        }

        if (document.status === "processing" || document.status === "ready") {
            res.status(409).json({ error: `Document is already ${document.status}` });
            return;
        }

        await markQueued(documentId, tenantId);

        try {
            await enqueueDocument(documentId, tenantId);
        } catch (err) {
            console.error("[queue] retry could not add the job:", (err as Error).message);
            res.status(503).json({ error: "The queue is not available right now. Try again soon." });
            return;
        }

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not retry the document" });
    }
}

export async function removeDocument(req: Request, res: Response) {
    const { tenantId } = getAuth(res);
    const documentId = String(req.params.documentId);

    if (!isUuid(documentId)) {
        res.status(400).json({ error: "documentId is not a valid id" });
        return;
    }

    try {
        const deleted = await deleteDocument(documentId, tenantId);
        if (!deleted) {
            res.status(404).json({ error: "Document not found" });
            return;
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not delete the document" });
    }
}