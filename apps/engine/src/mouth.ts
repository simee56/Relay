import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";

const apiKey = process.env.GROQ_API_KEY;
const ttsModel = process.env.GROQ_TTS_MODEL ?? "canopylabs/orpheus-v1-english";
const ttsVoice = process.env.GROQ_TTS_VOICE ?? "hannah";

if (!apiKey) {
  throw new Error("GROQ_API_KEY is missing. Add it to your .env file.");
}

export async function speak(text: string): Promise<Buffer> {
  const start = Date.now();

  const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ttsModel,
      voice: ttsVoice,
      input: text,
      response_format: "wav",
    }),
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