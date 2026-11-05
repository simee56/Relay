import "dotenv/config";
import { Agent, fetch as undiciFetch, FormData } from "undici";

// Keeps connections to the AI providers open for 60 s of idle time
// (the default is only about 4 s)
const agent = new Agent({
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 600_000,
});

export function apiFetch(
  url: string,
  init: Parameters<typeof undiciFetch>[1] = {}
) {
  return undiciFetch(url, { ...init, dispatcher: agent });
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
    console.log("[warmup] failed (not a problem):", err);
  }
}

export { FormData };