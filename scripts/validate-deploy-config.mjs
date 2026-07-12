import { readFile } from "node:fs/promises";

const environment = process.argv[2];
if (!environment) throw new Error("Wrangler environment is required");

const source = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const config = JSON.parse(source.replace(/^\s*\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1"));
const selected = config.env?.[environment];
if (!selected) throw new Error(`Wrangler environment ${environment} is not configured`);

const origin = new URL(selected.vars?.PUBLIC_ORIGIN ?? "");
if (
  origin.protocol !== "https:" ||
  origin.hostname === "localhost" ||
  origin.hostname.endsWith(".invalid")
) {
  throw new Error(`${environment} PUBLIC_ORIGIN must be a deployable HTTPS origin`);
}
if (selected.vars?.DEV_ACCESS_BYPASS !== "false") {
  throw new Error(`${environment} must disable the development Access bypass`);
}
if (!selected.r2_buckets?.some(({ binding }) => binding === "PRIZE_IMAGES")) {
  throw new Error(`${environment} must bind the private PRIZE_IMAGES bucket`);
}
for (const binding of ["BINGO_ROOM", "REACTION_ROOM"]) {
  if (!selected.durable_objects?.bindings?.some(({ name }) => name === binding)) {
    throw new Error(`${environment} must bind ${binding}`);
  }
}

console.log(`Validated Wrangler environment: ${environment}`);
