import { redis } from "./redis";

export async function isLocked(key: string, max: number): Promise<number | null> {
    try {
        const value = await redis.get(key);
        if (value === null || Number(value) < max) return null;

        const ttl = await redis.ttl(key);
        return ttl > 0 ? ttl : 1;
    } catch (err) {
        console.error("[rate-limit] Redis unavailable, allowing the request:", (err as Error).message);
        return null;
    }
}

export async function recordFailure(key: string, windowSeconds: number): Promise<void> {
    try {

        await redis.multi().incr(key).expire(key, windowSeconds, "NX").exec();
    } catch (err) {
        console.error("[rate-limit] could not record the failure:", (err as Error).message);
    }
}

export async function clearFailures(key: string): Promise<void> {
    try {
        await redis.del(key);
    } catch (err) {
        console.error("[rate-limit] could not clear failures:", (err as Error).message);
    }
}