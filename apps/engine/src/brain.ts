import "dotenv/config";
import { apiFetch } from "./http";
import { SentenceSplitter } from "./sentences";

const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Add it to your .env file.");
}

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const FALLBACK_SYSTEM_PROMPT =
    "You are a friendly phone receptionist. Reply in one or two short sentences, in plain spoken words.";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type BrainOptions = {
    systemPrompt?: string;
    history?: ChatMessage[];
    signal?: AbortSignal;
};

function buildBody(systemPrompt: string, history: ChatMessage[], userText: string) {
    const effort = process.env.GROQ_REASONING_EFFORT;
    return JSON.stringify({
        model,
        stream: true,
        ...(effort ? { reasoning_effort: effort } : {}),
        messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userText },
        ],
    });
}

const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
};

// Streaming: get the answer piece by piece
export async function askBrainStreaming(
    userText: string,
    onToken: (token: string) => void,
    options: BrainOptions = {}
): Promise<string> {
    const { systemPrompt = FALLBACK_SYSTEM_PROMPT, history = [], signal } = options;
    const start = Date.now();

    const response = await apiFetch(API_URL, {
        method: "POST",
        headers,
        body: buildBody(systemPrompt, history, userText),
        signal,
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
        buffer = lines.pop() ?? "";

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

// Streams the reply and calls onSentence for each complete sentence
export async function askBrainBySentence(
    userText: string,
    onSentence: (sentence: string) => void,
    options: BrainOptions = {}
): Promise<string> {
    const splitter = new SentenceSplitter();

    const fullText = await askBrainStreaming(
        userText,
        (token) => {
            for (const sentence of splitter.push(token)) {
                onSentence(sentence);
            }
        },
        options
    );

    const rest = splitter.flush();
    if (rest) onSentence(rest);

    return fullText;
}