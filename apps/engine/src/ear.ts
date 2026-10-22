import "dotenv/config";

const apiKey = process.env.GROQ_API_KEY;
const sttModel = process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo";

if (!apiKey) {
  throw new Error("GROQ_API_KEY is missing. Add it to your .env file.");
}

export async function listen(audio: Buffer, filename = "audio.wav"): Promise<string> {
  const start = Date.now();

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)]), filename);
  form.append("model", sttModel);
  form.append("response_format", "text");
  form.append("language", "en");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` }, 
    body: form,
  });

  if (!response.ok) {
    throw new Error(`STT error ${response.status}: ${await response.text()}`);
  }

  const text = (await response.text()).trim();
  console.log(`[ear] transcribed in ${Date.now() - start} ms`);
  return text;
}