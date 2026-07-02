#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(repoRoot, "supabase", "migrations");
const seedPath = join(repoRoot, "supabase", "seed.sql");
const dbContainer = process.env.SUPABASE_SELFHOST_DB_CONTAINER || "supabase-db";

function runPsql(sql, { capture = false } = {}) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      dbContainer,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    {
      input: sql,
      encoding: "utf8",
      stdio: capture ? ["pipe", "pipe", "pipe"] : ["pipe", "inherit", "inherit"],
    },
  );

  if (result.status !== 0) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }

  return capture ? result.stdout.trim() : "";
}

if (!existsSync(migrationsDir)) {
  console.error(`Missing migrations directory: ${migrationsDir}`);
  process.exit(1);
}

const migrations = readdirSync(migrationsDir)
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

for (const file of migrations) {
  console.log(`Applying ${file}`);
  runPsql(readFileSync(join(migrationsDir, file), "utf8"));
}

if (existsSync(seedPath)) {
  const shouldSeed = runPsql(
    "select case when to_regclass('public.prizes') is null then 'yes' when (select count(*) from public.prizes) = 0 then 'yes' else 'no' end;",
    { capture: true },
  )
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line === "yes" || line === "no");

  if (shouldSeed === "yes") {
    console.log("Applying seed.sql");
    runPsql(readFileSync(seedPath, "utf8"));
  } else {
    console.log("Skipping seed.sql because public.prizes already has rows");
  }
}

console.log("Supabase self-host database schema is ready.");
