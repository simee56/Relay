import "dotenv/config";
import { UnrecoverableError, Worker } from "bullmq";
import { pool } from "./db";
import { getEmbedder } from "./embedder";
import { log } from "./log";
import { processDocument, type DocumentJobData } from "./processDocument";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

const DOCUMENT_QUEUE = "documents";

const FAKE_FAILS = Number(process.env.FAKE_FAILS ?? 0);

async function markDocumentFailed(documentId: string, tenantId: string, message: string) {
    await pool.query(
        "UPDATE documents SET status = 'failed', error = $3 WHERE id = $1 AND tenant_id = $2",
        [documentId, tenantId, message.slice(0, 500)]
    );
}

const worker = new Worker<DocumentJobData>(
    DOCUMENT_QUEUE,
    async (job) => {
        log(`[job ${job.id}] started (try ${job.attemptsMade + 1} of ${job.opts.attempts})`);

        if (job.attemptsMade < FAKE_FAILS) {
            throw new Error("fake failure, on purpose");
        }

        return processDocument(job);
    },
    {
        connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            password: redisUrl.password || undefined,
        },
        concurrency: 1,
    }
);

worker.on("completed", (job, result) => {
    log(`[queue] job ${job.id} completed ${JSON.stringify(result)}`);
});

worker.on("failed", async (job, err) => {
    if (!job) return;

    const attempts = job.opts.attempts ?? 1;
    const isFinal = err instanceof UnrecoverableError || job.attemptsMade >= attempts;

    if (!isFinal) {
        log(`[queue] job ${job.id} failed (${err.message}), will retry`);
        return;
    }

    log(`[queue] job ${job.id} failed for good: ${err.message}`);

    const message =
        err instanceof UnrecoverableError
            ? err.message
            : `Processing failed after ${attempts} attempts: ${err.message}`;

    try {
        await markDocumentFailed(job.data.documentId, job.data.tenantId, message);
    } catch (dbErr) {
        console.error("[worker] could not save the failed status:", (dbErr as Error).message);
    }
});

worker.on("stalled", (jobId) => log(`[queue] job ${jobId} stalled, putting it back in line`));
worker.on("error", (err) => console.error("[worker]", err.message));

getEmbedder().catch((err) => console.error("[embedder] could not load the model:", err.message));

log(`Relay worker running. Waiting for jobs on the "${DOCUMENT_QUEUE}" queue.`);

async function shutdown(signal: string) {
    log(`${signal} received, finishing the current job before stopping...`);
    await worker.close();
    await pool.end();
    process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));