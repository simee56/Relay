import { pipeline } from "@huggingface/transformers";

type Embedder = (
    text: string,
    options: { pooling: "mean"; normalize: boolean }
) => Promise<{ data: ArrayLike<number> }>;

const MODEL = "Xenova/all-MiniLM-L6-v2"; 
export const EMBEDDING_DIMENSIONS = 384;

let embedderPromise: Promise<Embedder> | null = null;

export function getEmbedder(): Promise<Embedder> {
    if (!embedderPromise) {
        const start = Date.now();
        embedderPromise = (pipeline("feature-extraction", MODEL) as unknown as Promise<Embedder>)
            .then((embed) => {
                console.log(`[embedder] model ready in ${Date.now() - start} ms`);
                return embed;
            })
            .catch((err) => {
                embedderPromise = null; 
                throw err;
            });
    }
    return embedderPromise;
}

export async function embedText(text: string): Promise<number[]> {
    const embed = await getEmbedder();
    const output = await embed(text, { pooling: "mean", normalize: true });
    const vector = Array.from(output.data);

    if (vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`expected ${EMBEDDING_DIMENSIONS} numbers, got ${vector.length}`);
    }
    return vector;
}