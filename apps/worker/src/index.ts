import "dotenv/config";
import { Worker, type Job } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

const DOCUMENT_QUEUE = "documents";

type DocumentJobData = {
    documentId: string;
    tenantId: string;
};

const FAKE_FAILS = Number(process.env.FAKE_FAILS ?? 0);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function log(message: string) {
    console.log(`${new Date().toLocaleTimeString()}  ${message}`);
}

async function processDocument(job: Job<DocumentJobData>) {
    const { documentId, tenantId } = job.data;

    log(
        `[job ${job.id}] started (try ${job.attemptsMade + 1} of ${job.opts.attempts}) ` +
        `document=${documentId} business=${tenantId}`
    );

    await sleep(3000); // pretend to work

    if (job.attemptsMade < FAKE_FAILS) {
        throw new Error("fake failure, on purpose");
    }

    log(`[job ${job.id}] finished`);
}

const worker = new Worker<DocumentJobData>(DOCUMENT_QUEUE, processDocument, {
    connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        password: redisUrl.password || undefined,
    },
    concurrency: 1, // one job at a time
});

worker.on("completed", (job) => log(`[queue] job ${job.id} completed`));
worker.on("failed", (job, err) => log(`[queue] job ${job?.id} failed: ${err.message}`));
worker.on("error", (err) => console.error("[worker]", err.message));

log(`Relay worker running. Waiting for jobs on the "${DOCUMENT_QUEUE}" queue.`);

async function shutdown(signal: string) {
    log(`${signal} received, finishing the current job before stopping...`);
    await worker.close();
    process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));