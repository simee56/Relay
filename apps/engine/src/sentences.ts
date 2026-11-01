// Collects streamed text and hands back complete sentences as they appear.
export class SentenceSplitter {
    private buffer = "";

    // Feed in new text. Returns any sentences that are now complete.
    push(text: string): string[] {
        this.buffer += text;
        const sentences: string[] = [];

        while (true) {
            const match = /[.!?]+(\s+)/.exec(this.buffer);
            if (!match) break;

            const punctLength = match[0].length - match[1].length;
            const sentence = this.buffer.slice(0, match.index + punctLength).trim();
            this.buffer = this.buffer.slice(match.index + match[0].length);

            if (sentence) sentences.push(sentence);
        }

        return sentences;
    }

    flush(): string | null {
        const rest = this.buffer.trim();
        this.buffer = "";
        return rest || null;
    }
}