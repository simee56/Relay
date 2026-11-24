export type ChunkOptions = {
    maxChars?: number;
    overlapChars?: number;
};

const DEFAULT_MAX_CHARS = 250;
const DEFAULT_OVERLAP_CHARS = 50;

function splitLongText(text: string, maxChars: number): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const pieces: string[] = [];

    for (const sentence of sentences) {
        if (sentence.length <= maxChars) {
            pieces.push(sentence);
            continue;
        }

        let rest = sentence;
        while (rest.length > maxChars) {
            let cut = rest.lastIndexOf(" ", maxChars);
            if (cut <= 0) cut = maxChars;
            pieces.push(rest.slice(0, cut).trim());
            rest = rest.slice(cut).trim();
        }
        if (rest) pieces.push(rest);
    }

    return pieces.filter((piece) => piece.length > 0);
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
    const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
    const overlapChars = Math.min(
        options.overlapChars ?? DEFAULT_OVERLAP_CHARS,
        Math.floor(maxChars / 3)
    );

    const units: string[] = [];
    for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
        const line = rawLine.replace(/\s+/g, " ").trim();
        if (!line) continue;

        if (line.length <= maxChars) units.push(line);
        else units.push(...splitLongText(line, maxChars));
    }

    const lengthOf = (parts: string[]) => parts.join("\n").length;

    const chunks: string[] = [];
    let current: string[] = [];

    for (const unit of units) {
        if (current.length > 0 && lengthOf([...current, unit]) > maxChars) {
            chunks.push(current.join("\n"));

            const carried: string[] = [];
            for (let i = current.length - 1; i >= 0; i--) {
                if (lengthOf([current[i], ...carried]) > overlapChars) break;
                carried.unshift(current[i]);
            }

            current = lengthOf([...carried, unit]) <= maxChars ? carried : [];
        }

        current.push(unit);
    }

    if (current.length > 0) chunks.push(current.join("\n"));

    return chunks;
}