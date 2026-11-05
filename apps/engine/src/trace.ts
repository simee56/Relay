const recentTotals: number[] = [];
const MAX_KEPT = 50;

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.max(0, rank - 1)];
}

export class TurnTrace {
  private readonly t0 = Date.now();
  private marks: Record<string, number> = {};

  constructor(private readonly turn: number) {}

  mark(name: string): void {
    if (this.marks[name] === undefined) {
      this.marks[name] = Date.now() - this.t0;
    }
  }

  finish(): void {
    const { earDone, firstSentence, firstAudioSent } = this.marks;
    if (earDone === undefined || firstSentence === undefined || firstAudioSent === undefined) {
      return;
    }

    const ear = earDone;
    const brain = firstSentence - earDone;
    const mouth = firstAudioSent - firstSentence;

    console.log(
      `[turn ${this.turn}] first audio ${firstAudioSent} ms (ear ${ear}, brain ${brain}, mouth ${mouth})`
    );

    recentTotals.push(firstAudioSent);
    if (recentTotals.length > MAX_KEPT) recentTotals.shift();

    if (recentTotals.length >= 5) {
      console.log(
        `[stats] last ${recentTotals.length} turns: p50 ${percentile(recentTotals, 50)} ms, p95 ${percentile(recentTotals, 95)} ms`
      );
    }
  }
}