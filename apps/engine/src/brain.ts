import "dotenv/config";
import { SentenceSplitter } from "./sentences";

const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL;

if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Add it to your .env file.");
}

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT =
    "You are a friendly phone receptionist for Ravi's Pizza Shop. " +
    "Open 11 AM to 10 PM. Menu: veg pizza, paneer pizza, garlic bread. " +
    "You are speaking on a phone call, so reply in one or two short sentences, " +
    "under 30 words in total. Use plain spoken words only: no lists, no emojis, no markdown. " +
    "If you are not sure about something, say so and offer to take a message instead of guessing.";

type ChatResponse = {
    choices: { message: { content: string } }[];
}

function buildBody(userText: string, stream: boolean) {
    return JSON.stringify({
        model,
        stream,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText }
        ],
    });
}

const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
};

// Wait for the full answer
export async function askBrain(userText: string): Promise<string> {
    const start = Date.now();

    const response = await fetch(API_URL, {
        method: "Post",
        headers,
        body: buildBody(userText, false),
    });

    if (!response.ok) {
        throw new Error(`Groq error ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as ChatResponse;
    console.log(`[normal] full answer took ${Date.now() - start} ms`);
    return data.choices[0].message.content;
}

// Get the answer piece by piece
export async function askBrainStreaming(
    userText: string,
    onToken: (token: string) => void
): Promise<string> {
    const start = Date.now();
    const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: buildBody(userText, true),
    });

    if (!response.ok || !response.body) {
        throw new Error(`Groq error ${response.status}: ${await response.text()}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let firstTokenSeen = false;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep the unfinished last line for next round

        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;

            const json = JSON.parse(payload);
            const token: string | undefined = json.choices?.[0]?.delta?.content;
            if (!token) continue;

            if (!firstTokenSeen) {
                firstTokenSeen = true;
                console.log(`\n[stream] time to first token: ${Date.now() - start} ms`);
            }
            fullText += token;
            onToken(token);
        }
    }

    console.log(`\n[stream] full answer took ${Date.now() - start} ms`);
    return fullText;
}

// Streams the reply and calls onSentence for each complete sentence.
export async function askBrainBySentence(
    userText: string,
    onSentence: (sentence: string) => void
): Promise<string> {
    const splitter = new SentenceSplitter();

    const fullText = await askBrainStreaming(userText, (token) => {
        for (const sentence of splitter.push(token)) {
            onSentence(sentence);
        }
    });

    const rest = splitter.flush();
    if (rest) onSentence(rest);

    return fullText;
}