import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { listen } from "./ear";
import { askBrainStreaming } from "./brain";
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
  let currentTurn = 0; // counts conversation turns on this connection

  ws.on("message", async (data, isBinary) => {
    // Text message: control signals from the browser
    if (!isBinary) {
      const msg = JSON.parse(data.toString());
      if (msg.type === "interrupt") {
        currentTurn++; // makes any in-progress turn "old"
        console.log("[ws] interrupted");
      }
      return;
    }

    // Binary message: the user's recorded speech
    const myTurn = ++currentTurn;
    const isStale = () => myTurn !== currentTurn;

    try {
      const heard = await listen(data as Buffer, "speech.webm");
      if (isStale()) return;
      sendJson(ws, { type: "transcript", text: heard });

      if (!heard) {
        sendJson(ws, { type: "error", message: "I did not catch that." });
        return;
      }

      const reply = await askBrainStreaming(heard, () => {});
      if (isStale()) return;
      sendJson(ws, { type: "reply", text: reply });

      const audioOut = await speak(reply);
      if (isStale()) return;
      ws.send(audioOut, { binary: true });
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