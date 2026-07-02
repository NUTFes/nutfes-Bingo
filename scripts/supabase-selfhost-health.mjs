#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath =
  process.env.SUPABASE_SELFHOST_ENV || join(repoRoot, "supabase", "self-host", ".env.local");
const publicUrl = process.env.SUPABASE_SELFHOST_HEALTH_URL || "http://127.0.0.1:8000";

function parseEnv(path) {
  const env = new Map();
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "" || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator);
    let value = line.slice(separator + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env.set(key, value);
  }
  return env;
}

async function assertOk(path, { headers = {}, expectJson = true } = {}) {
  const response = await fetch(`${publicUrl}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  if (expectJson) {
    await response.json();
  }
}

const env = parseEnv(envPath);
const anonKey = env.get("ANON_KEY");
if (!anonKey) {
  console.error(`ANON_KEY is missing in ${envPath}`);
  process.exit(1);
}

const authHeaders = {
  apikey: anonKey,
  authorization: `Bearer ${anonKey}`,
};

try {
  await assertOk("/auth/v1/health", { headers: authHeaders });
  await assertOk("/rest/v1/", { headers: authHeaders });
  console.log(`Supabase self-host health OK at ${publicUrl}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
