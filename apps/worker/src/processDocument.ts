import { UnrecoverableError, type Job } from "bullmq";
import { chunkText } from "./chunker";
import { pool } from "./db";
import { embedText } from "./embedder";
import { log } from "./log";

export type DocumentJobData = {
    documentId: string;
    tenantId: string;
};

export async function processDocument(job: Job<DocumentJobData>) {
    const { documentId, tenantId } = job.data;

    // 1. Load the document. 
    const found = await pool.query<{ content: string }>(
        "SELECT content FROM documents WHERE id = $1 AND tenant_id = $2",
        [documentId, tenantId]
    );
    if (found.rowCount === 0) {
        log(`[job ${job.id}] the document no longer exists, nothing to do`);
        return { skipped: "document no longer exists" };
    }
    const content = found.rows[0].content;

    // 2. Tell the owner we are working on it
    await pool.query(
        "UPDATE documents SET status = 'processing', error = NULL WHERE id = $1 AND tenant_id = $2",
        [documentId, tenantId]
    );

    // 3. Cut the text into chunks
    const pieces = chunkText(content);
    if (pieces.length === 0) {
        throw new UnrecoverableError("The document has no readable text.");
    }
    log(`[job ${job.id}] ${content.length} characters became ${pieces.length} chunk(s)`);

    // 4. Embed every chunk 
    const embedStart = Date.now();
    const vectors: number[][] = [];
    for (const piece of pieces) {
        vectors.push(await embedText(piece));
    }
    log(`[job ${job.id}] embedded ${pieces.length} chunk(s) in ${Date.now() - embedStart} ms`);

    // 5. Save everything, all or nothing
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const locked = await client.query(
            "SELECT 1 FROM documents WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
            [documentId, tenantId]
        );
        if (locked.rowCount === 0) {
            await client.query("ROLLBACK");
            log(`[job ${job.id}] the document was deleted while processing, nothing saved`);
            return { skipped: "document was deleted while processing" };
        }

        await client.query("DELETE FROM chunks WHERE document_id = $1", [documentId]);

        for (let i = 0; i < pieces.length; i++) {
            await client.query(
                `INSERT INTO chunks (document_id, tenant_id, position, content, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
                [documentId, tenantId, i, pieces[i], JSON.stringify(vectors[i])]
            );
        }

        await client.query(
            "UPDATE documents SET status = 'ready', error = NULL WHERE id = $1",
            [documentId]
        );

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK"); // undo everything
        throw err; // BullMQ will retry
    } finally {
        client.release(); // give the connection back to the pool
    }

    return { chunks: pieces.length };
}