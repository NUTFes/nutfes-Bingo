import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

const DEFAULT_LIMIT = 3 * 1024 * 1024;

function parsePositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

async function collectBundleFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectBundleFiles(entryPath)));
      continue;
    }

    if (/\.(?:js|mjs|cjs|wasm)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

const directory = path.resolve(process.argv[2] ?? ".wrangler-dist");
const limit = parsePositiveInteger(process.argv[3] ?? DEFAULT_LIMIT, "limit");
const files = await collectBundleFiles(directory);

if (files.length === 0) {
  throw new Error(`No Worker bundle modules found under ${directory}`);
}

let compressedBytes = 0;
for (const file of files) {
  compressedBytes += gzipSync(await readFile(file), { level: 9 }).byteLength;
}

const result = {
  compressedBytes,
  files: files.length,
  limitBytes: limit,
  remainingBytes: limit - compressedBytes,
};
console.log(JSON.stringify(result));

if (compressedBytes > limit) {
  throw new Error(
    `Worker bundle is ${compressedBytes} compressed bytes; Free plan limit is ${limit}`,
  );
}
