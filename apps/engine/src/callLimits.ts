import { redis } from "./redis";

const STALE_AFTER_MS = 60_000;
export const HEARTBEAT_MS = 20_000;

const keyFor = (tenantId: string) => `calls:active:${tenantId}`;

const ACQUIRE_SCRIPT = `
local t = redis.call('TIME')
local now = t[1] * 1000 + math.floor(t[2] / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - tonumber(ARGV[1]))
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then
  return 0
end
redis.call('ZADD', KEYS[1], now, ARGV[3])
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]) * 2)
return 1
`;

// KEYS[1] = the set, ARGV[1] = call id, ARGV[2] = stale after (ms)
const REFRESH_SCRIPT = `
local t = redis.call('TIME')
local now = t[1] * 1000 + math.floor(t[2] / 1000)
if redis.call('ZSCORE', KEYS[1], ARGV[1]) then
  redis.call('ZADD', KEYS[1], now, ARGV[1])
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]) * 2)
  return 1
end
return 0
`;

export async function acquireCallSlot(
    tenantId: string,
    callId: string,
    limit: number
): Promise<boolean> {
    try {
        const result = await redis.eval(ACQUIRE_SCRIPT, 1, keyFor(tenantId), STALE_AFTER_MS, limit, callId);
        return Number(result) === 1;
    } catch (err) {
        console.error("[calls] Redis unavailable, allowing the call:", (err as Error).message);
        return true;
    }
}

// "I am still alive": called every few seconds while a call is open
export async function refreshCallSlot(tenantId: string, callId: string): Promise<void> {
    try {
        await redis.eval(REFRESH_SCRIPT, 1, keyFor(tenantId), callId, STALE_AFTER_MS);
    } catch (err) {
        console.error("[calls] could not refresh the slot:", (err as Error).message);
    }
}

export async function releaseCallSlot(tenantId: string, callId: string): Promise<void> {
    try {
        await redis.zrem(keyFor(tenantId), callId);
    } catch (err) {
        console.error("[calls] could not release the slot:", (err as Error).message);
    }
}

export async function activeCalls(tenantId: string): Promise<number> {
    try {
        return await redis.zcard(keyFor(tenantId));
    } catch {
        return 0;
    }
}