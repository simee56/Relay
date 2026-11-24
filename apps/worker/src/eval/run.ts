import { chunkText } from "../chunker";
import { embedText } from "../embedder";
import { documentText, questions } from "./dataset";

const TOP_K = 3;
const SIZES = [150, 250, 400, 700, 1200];
const THRESHOLDS = [0.2, 0.3, 0.4, 0.5];

// Which setting to show in detail at the end. Change it with: npm run eval -- 400 0.35
const DETAIL_SIZE = Number(process.argv[2] ?? 400);
const DETAIL_THRESHOLD = Number(process.argv[3] ?? 0.35);

type Ranked = { text: string; score: number };

// Both vectors have length 1, so multiplying and adding gives the cosine similarity
function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

const flat = (text: string) => text.replace(/\s+/g, " ").toLowerCase();
const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((100 * part) / whole));
const snippet = (text: string, n = 55) => {
  const s = text.replace(/\s+/g, " ");
  return s.length > n ? `${s.slice(0, n)}...` : s;
};

// The same idea as in the engine: very short follow-ups get the previous question added
function searchTextFor(question: string, previous?: string): string {
  const wordCount = question.trim().split(/\s+/).length;
  return wordCount <= 6 && previous ? `${previous} ${question}` : question;
}

// Embedding the same text twice is a waste, so we remember the results
const cache = new Map<string, number[]>();
async function embedCached(text: string): Promise<number[]> {
  const known = cache.get(text);
  if (known) return known;
  const vector = await embedText(text);
  cache.set(text, vector);
  return vector;
}

type Setup = { chunks: string[]; vectors: number[][] };

// Cuts the document at this chunk size and embeds the chunks
async function prepare(maxChars: number): Promise<Setup> {
  const chunks = chunkText(documentText, {
    maxChars,
    overlapChars: Math.round(maxChars * 0.2),
  });
  const vectors: number[][] = [];
  for (const chunk of chunks) vectors.push(await embedCached(chunk));
  return { chunks, vectors };
}

// All chunks, best first
async function rankFor(setup: Setup, searchText: string): Promise<Ranked[]> {
  const queryVector = await embedCached(searchText);
  return setup.chunks
    .map((text, i) => ({ text, score: dot(queryVector, setup.vectors[i]) }))
    .sort((a, b) => b.score - a.score);
}

// What the engine would give the Brain: the best chunks that score high enough
function delivered(ranked: Ranked[], threshold: number): Ranked[] {
  return ranked.filter((r) => r.score >= threshold).slice(0, TOP_K);
}

const contains = (chunks: Ranked[], expected: string) =>
  chunks.some((r) => flat(r.text).includes(flat(expected)));

// Scores one setting over all the questions
function summarize(rankings: Ranked[][], threshold: number) {
  let answerable = 0;
  let found = 0;
  let top1 = 0;
  let unanswerable = 0;
  let wrong = 0;

  questions.forEach((q, i) => {
    const ranked = rankings[i];
    const got = delivered(ranked, threshold);

    if (q.expected) {
      answerable++;
      if (contains(got, q.expected)) found++;
      if (contains(ranked.slice(0, 1), q.expected)) top1++;
    } else {
      unanswerable++;
      if (got.length > 0) wrong++;
    }
  });

  return {
    found: pct(found, answerable),
    top1: pct(top1, answerable),
    wrong: pct(wrong, unanswerable),
  };
}

async function rankAll(setup: Setup): Promise<Ranked[][]> {
  const rankings: Ranked[][] = [];
  for (const q of questions) {
    rankings.push(await rankFor(setup, searchTextFor(q.question, q.previous)));
  }
  return rankings;
}

async function main() {
  console.log("Loading the embedding model...");
  await embedCached("warm up");

  const answerableCount = questions.filter((q) => q.expected).length;
  console.log(
    `${questions.length} questions: ${answerableCount} the document can answer, ` +
      `${questions.length - answerableCount} it cannot. Top ${TOP_K} chunks, overlap 20% of the size.\n`
  );

  // The grid: each cell is "found% / wrongly-answered%"
  const col = (text: string, width: number) => text.padEnd(width);
  console.log(
    col("chunk size", 12) + col("chunks", 8) + col("top-1 hit", 11) +
      THRESHOLDS.map((t) => col(`min ${t.toFixed(2)}`, 15)).join("")
  );
  console.log("-".repeat(12 + 8 + 11 + THRESHOLDS.length * 15));

  for (const size of SIZES) {
    const setup = await prepare(size);
    const rankings = await rankAll(setup);
    const cells = THRESHOLDS.map((t) => {
      const s = summarize(rankings, t);
      return col(`${s.found}% / ${s.wrong}%`, 15);
    });
    const top1 = summarize(rankings, THRESHOLDS[0]).top1;
    console.log(col(String(size), 12) + col(String(setup.chunks.length), 8) + col(`${top1}%`, 11) + cells.join(""));
  }
  console.log("\nEach cell: found% / wrongly-answered%   (we want the first high and the second low)\n");

  // The details for one setting
  console.log(`=== Details for chunk size ${DETAIL_SIZE}, minimum score ${DETAIL_THRESHOLD} ===`);
  const setup = await prepare(DETAIL_SIZE);
  const rankings = await rankAll(setup);
  let deliveredChars = 0;
  let followUps = 0;
  let followUpsFoundWith = 0;
  let followUpsFoundWithout = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ranked = rankings[i];
    const got = delivered(ranked, DETAIL_THRESHOLD);
    deliveredChars += got.reduce((sum, r) => sum + r.text.length, 0);
    const best = ranked[0];

    if (q.expected) {
      const ok = contains(got, q.expected);
      console.log(`${ok ? "OK   " : "MISS "} [${best.score.toFixed(2)}] ${q.question}`);
      if (!ok) {
        console.log(`       needed: "${q.expected}"`);
        console.log(`       best chunk: "${snippet(best.text)}"`);
      }
    } else {
      const ok = got.length === 0;
      console.log(`${ok ? "OK   " : "WRONG"} [${best.score.toFixed(2)}] ${q.question}   (no answer exists)`);
      if (!ok) console.log(`       it still delivered: "${snippet(got[0].text)}"`);
    }

    if (q.previous && q.expected) {
      followUps++;
      if (contains(got, q.expected)) followUpsFoundWith++;
      const plain = delivered(await rankFor(setup, q.question), DETAIL_THRESHOLD);
      if (contains(plain, q.expected)) followUpsFoundWithout++;
    }
  }

  console.log(
    `\nAverage text delivered per question: ${Math.round(deliveredChars / questions.length)} characters`
  );
  console.log(
    `Follow-up questions found: ${followUpsFoundWith} of ${followUps} with the previous question added, ` +
      `${followUpsFoundWithout} of ${followUps} without it`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});