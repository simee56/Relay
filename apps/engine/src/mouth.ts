import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { apiFetch } from "./http";

const apiKey = process.env.GROQ_API_KEY;
const ttsModel = process.env.GROQ_TTS_MODEL ?? "canopylabs/orpheus-v1-english";
const defaultVoice = process.env.GROQ_TTS_VOICE ?? "hannah";

if (!apiKey) {
  throw new Error("GROQ_API_KEY is missing. Add it to your .env file.");
}

export type SpeakOptions = {
  voice?: string;
  signal?: AbortSignal;
};

export async function speak(text: string, options: SpeakOptions = {}): Promise<Buffer> {
  const { voice = defaultVoice, signal } = options;
  const start = Date.now();

  const response = await apiFetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ttsModel,
      voice,
      input: text,
      response_format: "wav",
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`TTS error ${response.status}: ${await response.text()}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  console.log(`\n[mouth] audio ready in ${Date.now() - start} ms`);
  return audio;
}

export async function saveAudio(audio: Buffer, filename: string): Promise<string> {
  await mkdir("output", { recursive: true });
  const path = `output/${filename}`;
  await writeFile(path, audio);
  return path;
}