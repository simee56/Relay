import "dotenv/config";
import { Agent, fetch as undiciFetch, FormData } from "undici";

// Keeps connections to the AI providers open for 60 s of idle time
// (the default is only about 4 s)
// family: 4 means "use IPv4 only"
const agent = new Agent({
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 600_000,
  connect: { family: 4, timeout: 3000 },
  headersTimeout: 8000,
  bodyTimeout: 10_000,
});

// Network failures that are worth one more try
const RETRYABLE_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT", 
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

export function networkErrorCode(err: unknown): string | null {
  const e = err as { name?: string; cause?: { code?: string; name?: string } } | null;
  if (e?.name === "AbortError" || e?.cause?.name === "AbortError") return null;
  const code = e?.cause?.code;
  return typeof code === "string" && RETRYABLE_CODES.has(code) ? code : null;
}

export function isNetworkError(err: unknown): boolean {
  return networkErrorCode(err) !== null;
}

export async function apiFetch(
  url: string,
  init: Parameters<typeof undiciFetch>[1] = {}
) {
  const attempt = () => undiciFetch(url, { ...init, dispatcher: agent });

  try {
    return await attempt();
  } catch (err) {
    const code = networkErrorCode(err);
    if (!code || init.signal?.aborted) throw err; // not retryable, or cancelled

    console.log(`[net] ${code}, retrying once`);
    await new Promise((resolve) => setTimeout(resolve, 250));
    return attempt(); // if this fails too, the error goes to the caller
  }
}

export async function warmUp(): Promise<void> {
  const t0 = Date.now();
  try {
    const res = await apiFetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    });
    await res.arrayBuffer();
    console.log(`[warmup] connection ready in ${Date.now() - t0} ms`);
  } catch (err) {
    console.log(`[warmup] failed (not a problem): ${networkErrorCode(err) ?? String(err)}`);
  }
}

export { FormData };