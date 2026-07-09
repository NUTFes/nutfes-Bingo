#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function trackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function isBinary(text) {
  return text.includes("\u0000");
}

function lineNumberForIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function envValue(line, name) {
  const match = new RegExp(`^${name}=([^#\\r\\n]*)`).exec(line.trim());
  if (!match) {
    return null;
  }

  let value = match[1].trim();
  if (
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) &&
    value.length >= 2
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function isAllowedPlaceholder(value) {
  return value.startsWith("replace-with-") || value === "[]" || value === '{"keys":[]}';
}

function isEnvExample(path) {
  return /(^|\/)\.env.*example$/.test(path);
}

function addFinding(findings, path, line, rule) {
  findings.push(`Secret-like value detected: ${path}:${line} ${rule}`);
}

const findings = [];
const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const supabaseSecretPrefix = "sb_" + "secret_";

for (const path of trackedFiles()) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  if (isBinary(text)) {
    continue;
  }

  for (const match of text.matchAll(new RegExp(supabaseSecretPrefix, "g"))) {
    addFinding(findings, path, lineNumberForIndex(text, match.index ?? 0), "sb_secret_key");
  }

  for (const match of text.matchAll(jwtPattern)) {
    addFinding(findings, path, lineNumberForIndex(text, match.index ?? 0), "jwt_value");
  }

  if (path.startsWith("src/")) {
    for (const match of text.matchAll(/createBrowserClient|NEXT_PUBLIC_SUPABASE_/g)) {
      addFinding(
        findings,
        path,
        lineNumberForIndex(text, match.index ?? 0),
        "browser_supabase_boundary",
      );
    }
  }

  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const lineNo = index + 1;

    const tunnelToken = envValue(line, "CLOUDFLARE_TUNNEL_TOKEN");
    if (tunnelToken !== null && tunnelToken !== "" && !isAllowedPlaceholder(tunnelToken)) {
      addFinding(findings, path, lineNo, "cloudflare_tunnel_token");
    }

    const jwtKeys = envValue(line, "JWT_KEYS");
    if (jwtKeys !== null && jwtKeys !== "" && jwtKeys !== "[]") {
      try {
        const parsed = JSON.parse(jwtKeys);
        const keys = Array.isArray(parsed) ? parsed : parsed?.keys;
        if (
          Array.isArray(keys) &&
          keys.some((key) => key && typeof key === "object" && "d" in key)
        ) {
          addFinding(findings, path, lineNo, "jwt_private_key");
        }
      } catch {
        if (/"d"\s*:/.test(jwtKeys)) {
          addFinding(findings, path, lineNo, "jwt_private_key");
        }
      }
    }

    for (const name of ["SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]) {
      const value = envValue(line, name);
      if (value === null || value === "") {
        continue;
      }
      if (isEnvExample(path) && !isAllowedPlaceholder(value)) {
        addFinding(findings, path, lineNo, `${name.toLowerCase()}_example_value`);
      }
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(finding);
  }
  process.exit(1);
}

console.log("Secret scan passed.");
