import { rm } from "node:fs/promises";

await rm(".wrangler/state", { recursive: true, force: true });
console.log("Local Durable Object and R2 state removed.");
