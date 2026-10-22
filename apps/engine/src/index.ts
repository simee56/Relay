import { askBrainStreaming } from "./brain";
import { speak, saveAudio } from "./mouth";
import { listen } from "./ear";

async function main() {
  const question = "Hi, are you open right now? Do you have paneer pizza?";

  const reply = await askBrainStreaming(question, (token) =>
    process.stdout.write(token)
  );

  const audio = await speak(reply);
  const path = await saveAudio(audio, "reply.wav");
  console.log(`Saved: ${path}`);

  const heard = await listen(audio);
  console.log("\nAI said :", reply);
  console.log("Ear heard:", heard);
}

main();