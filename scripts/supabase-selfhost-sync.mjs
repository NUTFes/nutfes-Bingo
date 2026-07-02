#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamRef = process.env.SUPABASE_SELFHOST_REF || "5c0b6279045f4fa53f1d7db375957a11d987f920";
const remote = process.env.SUPABASE_SELFHOST_REMOTE || "https://github.com/supabase/supabase.git";
const dest = join(repoRoot, "supabase", "self-host", "upstream");
const tmp = join(repoRoot, ".tmp", `supabase-selfhost-${process.pid}`);

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

try {
  run("git", ["init", "--quiet"], { cwd: tmp });
  run("git", ["remote", "add", "origin", remote], { cwd: tmp });
  run("git", ["sparse-checkout", "init", "--cone"], { cwd: tmp });
  run("git", ["sparse-checkout", "set", "docker"], { cwd: tmp });
  run("git", ["fetch", "--depth", "1", "origin", upstreamRef], { cwd: tmp });
  run("git", ["checkout", "--quiet", "FETCH_HEAD"], { cwd: tmp });

  const dockerDir = join(tmp, "docker");
  if (!existsSync(join(dockerDir, "docker-compose.yml"))) {
    throw new Error(`Supabase docker-compose.yml not found at ref ${upstreamRef}`);
  }

  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(dockerDir, dest, { recursive: true, force: true });
  writeFileSync(join(repoRoot, "supabase", "self-host", "UPSTREAM_REF"), `${upstreamRef}\n`);

  console.log(`Synced Supabase self-host Docker files to ${dest}`);
  console.log(`Pinned ref: ${upstreamRef}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
