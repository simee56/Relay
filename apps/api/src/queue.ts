import "dotenv/config";
import { Queue } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

export const DOCUMENT_QUEUE = "documents";

export type DocumentJobData = {
    documentId: string;
    tenantId: string;
};

export const documentQueue = new Queue<DocumentJobData>(DOCUMENT_QUEUE, {
    connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        password: redisUrl.password || undefined,
    },
});

documentQueue.on("error", (err) => {
    console.error("[queue]", err.message);
});

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}

export async function enqueueDocument(documentId: string, tenantId: string): Promise<void> {
    await withTimeout(
        (async () => {
            const existing = await documentQueue.getJob(documentId);
            if (existing) {
                const state = await existing.getState();
                if (state === "completed" || state === "failed") {
                    await existing.remove();
                }
            }

            await documentQueue.add(
                "process-document",
                { documentId, tenantId },
                {
                    jobId: documentId, // the same document can never be queued twice
                    attempts: 3, // try up to 3 times in total
                    backoff: { type: "exponential", delay: 5000 }, // pause 5 s, then 10 s
                    removeOnComplete: { age: 3600, count: 100 }, // keep a little history, then clean up
                    removeOnFail: { age: 7 * 24 * 3600 }, // keep failed jobs for a week to inspect
                }
            );
        })(),
        3000,
        "adding the job"
    );
}