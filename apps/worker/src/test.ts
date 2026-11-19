import { chunkText } from "./chunker";

const menuText = `Opening hours: we are open every day from 8 AM to 8 PM, including Sundays and public holidays.

Menu and prices:
Veg pizza costs 249 rupees.
Paneer pizza costs 299 rupees.
Garlic bread costs 129 rupees.
Fresh lime soda costs 59 rupees.
All pizzas are made with fresh dough every morning.

Delivery: home delivery is free for orders above 500 rupees. Below that, the delivery charge is 40 rupees. We deliver within 5 kilometres of the shop. Orders usually arrive within 30 to 40 minutes, but it can take longer when it rains or on busy evenings.

Payments: you can pay by cash, card or UPI. We do not accept cheques.

Location: the shop is on Station Road, next to the post office.`;

const limits = { maxChars: 200, overlapChars: 50 };

function show(title: string, text: string, options = limits) {
  const chunks = chunkText(text, options);
  console.log(`\n=== ${title}: ${chunks.length} chunk(s) ===`);
  chunks.forEach((chunk, i) => {
    console.log(`--- chunk ${i + 1} (${chunk.length} characters) ---`);
    console.log(chunk);
  });
  return chunks;
}

function check(label: string, passed: boolean) {
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);
}

// 1. The menu
const chunks = show("Menu", menuText);

check("no chunk is longer than the limit", chunks.every((c) => c.length <= limits.maxChars));
check("no empty chunks", chunks.every((c) => c.trim().length > 0));

// Every word of the original must show up in at least one chunk (nothing was lost)
const wordsIn = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
const original = wordsIn(menuText);
const inChunks = wordsIn(chunks.join(" "));
check("no words were lost", [...original].every((w) => inChunks.has(w)));

// Neighbouring chunks should share some text (the overlap)
let overlapFound = 0;
for (let i = 1; i < chunks.length; i++) {
  const lastLine = chunks[i - 1].split("\n").pop() ?? "";
  if (chunks[i].includes(lastLine)) overlapFound++;
}
console.log(`INFO  ${overlapFound} of ${chunks.length - 1} chunk boundaries have overlap`);

// 2. One very long paragraph with no line breaks
const longParagraph = "The pizza dough rests for a full day. ".repeat(30);
const longChunks = show("Long paragraph", longParagraph);
check("long paragraph: nothing over the limit", longChunks.every((c) => c.length <= limits.maxChars));

// 3. A string with no spaces at all (the worst case)
const noSpaces = "x".repeat(500);
const hardChunks = chunkText(noSpaces, limits);
check("text with no spaces is cut hard, nothing over the limit", hardChunks.every((c) => c.length <= limits.maxChars));

// 4. Empty and blank text
check("empty text gives no chunks", chunkText("").length === 0);
check("only whitespace gives no chunks", chunkText("  \n \t \n").length === 0);

// 5. The default settings on the menu: it is short, so it should be one chunk
check("menu with default settings fits in one chunk", chunkText(menuText).length === 1);