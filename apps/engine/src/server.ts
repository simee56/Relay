import http from "node:http";
import { randomUUID } from "node:crypto"; 
import { readFile } from "node:fs/promises";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { listen } from "./ear";
import { askBrainBySentence, type ChatMessage } from "./brain";
import { speak } from "./mouth";
import { TurnTrace } from "./trace";
import { warmUp, isNetworkError, networkErrorCode } from "./http";
import { getAgentById, getDefaultAgent, type Agent } from "./db";
import {
  HEARTBEAT_MS,
  acquireCallSlot,
  activeCalls,
  refreshCallSlot,
  releaseCallSlot,
} from "./callLimits";

const PORT = 3000;
const MAX_HISTORY_MESSAGES = 12;

// A cancelled request throws an "AbortError". That is not a real failure.
function isAbortError(err: unknown): boolean {
  const e = err as { name?: string; cause?: { name?: string } } | null;
  return e?.name === "AbortError" || e?.cause?.name === "AbortError";
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  if (pathname === "/" || pathname === "/index.html") {
    const html = await readFile(path.join(process.cwd(), "public", "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({ server });

function sendJson(ws: WebSocket, payload: object) {
  ws.send(JSON.stringify(payload));
}

wss.on("connection", (ws, req) => {
  console.log("[ws] client connected");
  void warmUp();
  let currentTurn = 0;
  const history: ChatMessage[] = [];
  let currentController: AbortController | null = null;

  const callId = randomUUID();
  let heldTenantId: string | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const requestedAgentId = new URL(req.url ?? "/", "http://localhost").searchParams.get("agent");


  const callReady: Promise<Agent | null> = (async () => {
    let found: Agent | null = null;
    try {
      found = requestedAgentId
        ? await getAgentById(requestedAgentId)
        : await getDefaultAgent();
    } catch (err) {
      console.error("[db] could not load the agent:", err);
      return null;
    }
    if (!found) return null;

    const agent: Agent = found;
    console.log(`[agent] loaded "${agent.name}" for ${agent.tenantName}`);

    const granted = await acquireCallSlot(agent.tenantId, callId, agent.maxConcurrentCalls);
    if (!granted) {
      console.log(
        `[calls] ${agent.tenantName} is at its limit (${agent.maxConcurrentCalls}), refusing this call`
      );
      sendJson(ws, { type: "error", message: "This line is busy. Please try again in a moment." });
      ws.close();
      return null;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      void releaseCallSlot(agent.tenantId, callId);
      return null;
    }

    heldTenantId = agent.tenantId;
    heartbeat = setInterval(() => {
      void refreshCallSlot(agent.tenantId, callId);
    }, HEARTBEAT_MS);

    console.log(
      `[calls] ${agent.tenantName}: ${await activeCalls(agent.tenantId)}/${agent.maxConcurrentCalls} active`
    );
    return agent;
  })();

  ws.on("message", async (data, isBinary) => {
    if (!isBinary) {
      const msg = JSON.parse(data.toString());
      if (msg.type === "interrupt") {
        currentTurn++;
        currentController?.abort();
        console.log("[ws] interrupted");
        void warmUp();
      }
      return;
    }

    // Binary message: the user's recorded speech
    const myTurn = ++currentTurn;
    const isStale = () => myTurn !== currentTurn;
    const trace = new TurnTrace(myTurn);

    currentController?.abort();
    const controller = new AbortController();
    currentController = controller;
    const signal = controller.signal;

    const agent = await callReady;
    if (!agent) {
      sendJson(ws, { type: "error", message: "No agent is available. Check the database." });
      return;
    }
    const agentVoice = agent.voice;

    let sentenceIndex = 0;
    let firstAudioSent = false;
    let sendChain: Promise<void> = Promise.resolve();

    function enqueueSentence(sentence: string) {
      if (isStale()) return;
      trace.mark("firstSentence");
      const myIndex = sentenceIndex++;

      const job = speak(sentence, { voice: agentVoice, signal });
      job.catch(() => { });

      sendChain = sendChain.then(async () => {
        try {
          const audio = await job;
          if (isStale()) return;
          sendJson(ws, { type: "audio", turn: myTurn, index: myIndex, text: sentence });
          ws.send(audio, { binary: true });

          if (!firstAudioSent) {
            firstAudioSent = true;
            trace.mark("firstAudioSent");
            trace.finish();
          }
        } catch (err) {
          if (isAbortError(err)) {
            console.log(`[cancel] turn ${myTurn}: voice request stopped`);
            return;
          }
          if (isStale()) return;
          if (isNetworkError(err)) {
            console.log(`[net] voice request failed: ${networkErrorCode(err)}`);
            sendJson(ws, { type: "error", message: "I'm having trouble connecting. Please try again." });
            return;
          }
          console.error("[mouth] failed for sentence:", sentence, err);
          sendJson(ws, { type: "error", message: "The voice failed for part of the reply." });
        }
      });
    }

    try {
      const heard = await listen(data as Buffer, "speech.webm", signal);
      trace.mark("earDone");
      if (isStale()) return;
      sendJson(ws, { type: "transcript", text: heard, turn: myTurn });

      const hasRealWords = /[\p{L}\p{N}]/u.test(heard);
      if (!hasRealWords) {
        sendJson(ws, {
          type: "error",
          message: "I did not catch that. Hold the button while you speak.",
        });
        return;
      }

      const reply = await askBrainBySentence(heard, enqueueSentence, {
        systemPrompt: agent.systemPrompt,
        history: [...history],
        signal,
      });
      if (isStale()) return;
      sendJson(ws, { type: "reply", text: reply });

      history.push({ role: "user", content: heard });
      history.push({ role: "assistant", content: reply });
      history.splice(0, Math.max(0, history.length - MAX_HISTORY_MESSAGES));
      console.log(`[memory] remembering ${history.length / 2} exchange(s)`);
    } catch (err) {
      if (isAbortError(err)) {
        console.log(`[cancel] turn ${myTurn}: stopped`);
        return;
      }
      if (isStale()) return;
      if (isNetworkError(err)) {
        console.log(`[net] request failed: ${networkErrorCode(err)}`);
        sendJson(ws, { type: "error", message: "I'm having trouble connecting. Please try again." });
        return;
      }
      console.error(err);
      sendJson(ws, { type: "error", message: "Something went wrong. Check the terminal." });
    }
  });

  ws.on("close", () => {
    currentController?.abort();
    if (heartbeat) clearInterval(heartbeat);
    if (heldTenantId) void releaseCallSlot(heldTenantId, callId);
    console.log("[ws] client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Relay engine running: http://localhost:${PORT}`);
});