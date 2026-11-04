import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { listen } from "./ear";
import { askBrainBySentence } from "./brain";
import { speak } from "./mouth";

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
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

wss.on("connection", (ws) => {
  console.log("[ws] client connected");
  let currentTurn = 0;

  ws.on("message", async (data, isBinary) => {
    if (!isBinary) {
      const msg = JSON.parse(data.toString());
      if (msg.type === "interrupt") {
        currentTurn++;
        console.log("[ws] interrupted");
      }
      return;
    }

    // Binary message: the user's recorded speech
    const myTurn = ++currentTurn;
    const isStale = () => myTurn !== currentTurn;
    const turnStart = Date.now();

    let sentenceIndex = 0;
    let firstAudioSent = false;
    let sendChain: Promise<void> = Promise.resolve();

    // Called once for every complete sentence from the Brain
    function enqueueSentence(sentence: string) {
      if (isStale()) return;
      const myIndex = sentenceIndex++;

      const job = speak(sentence);
      job.catch(() => { });

      // The chain makes sure clips are SENT in order
      sendChain = sendChain.then(async () => {
        try {
          const audio = await job;
          if (isStale()) return;
          sendJson(ws, { type: "audio", turn: myTurn, index: myIndex, text: sentence });
          ws.send(audio, { binary: true });

          if (!firstAudioSent) {
            firstAudioSent = true;
            console.log(
              `[turn ${myTurn}] first audio sent ${Date.now() - turnStart} ms after speech arrived`
            );
          }
        } catch (err) {
          console.error("[mouth] failed for sentence:", sentence, err);
        }
      });
    }

    try {
      const heard = await listen(data as Buffer, "speech.webm");
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

      const reply = await askBrainBySentence(heard, enqueueSentence);
      if (isStale()) return;
      sendJson(ws, { type: "reply", text: reply });
    } catch (err) {
      console.error(err);
      sendJson(ws, { type: "error", message: "Something went wrong. Check the terminal." });
    }
  });

  ws.on("close", () => console.log("[ws] client disconnected"));
});

server.listen(PORT, () => {
  console.log(`Relay engine running: http://localhost:${PORT}`);
});