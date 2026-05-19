#!/usr/bin/env node

import { performance } from "node:perf_hooks";

const DEFAULTS = {
  url: "http://localhost:3000/api/bingo/state",
  clients: 500,
  duration: 60,
  interval: 2000,
};

function readOption(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

function readNumberOption(name, fallback) {
  const value = Number(readOption(name, String(fallback)));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function percentile(values, ratio) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
}

const url = readOption("url", DEFAULTS.url);
const clients = readNumberOption("clients", DEFAULTS.clients);
const durationMs = readNumberOption("duration", DEFAULTS.duration) * 1000;
const intervalMs = readNumberOption("interval", DEFAULTS.interval);
const endAt = performance.now() + durationMs;
const latencies = [];
const statuses = new Map();
let errors = 0;

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runClient(clientIndex) {
  let etag;
  await sleep(Math.random() * intervalMs);

  while (performance.now() < endAt) {
    const startedAt = performance.now();

    try {
      const headers = etag ? { "If-None-Match": etag } : undefined;
      const response = await fetch(url, { headers });
      const elapsed = performance.now() - startedAt;
      latencies.push(elapsed);
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
      etag = response.headers.get("etag") ?? etag;

      if (response.status !== 304) {
        await response.arrayBuffer();
      }
    } catch {
      errors += 1;
    }

    const drift = performance.now() - startedAt;
    const jitter = intervalMs * 0.15 * Math.random();
    await sleep(Math.max(0, intervalMs - drift + jitter));
  }

  return clientIndex;
}

await Promise.all(Array.from({ length: clients }, (_, index) => runClient(index)));

const total = [...statuses.values()].reduce((sum, count) => sum + count, 0);
const sortedStatuses = [...statuses.entries()]
  .sort(([a], [b]) => a - b)
  .map(([status, count]) => `${status}:${count}`)
  .join(", ");
const failedStatuses = [...statuses.entries()].filter(([status]) => status >= 500);

console.log(
  JSON.stringify(
    {
      url,
      clients,
      durationSeconds: durationMs / 1000,
      intervalMs,
      totalRequests: total,
      statuses: sortedStatuses,
      errors,
      minMs: Math.round(Math.min(...latencies)),
      p50Ms: Math.round(percentile(latencies, 0.5)),
      p95Ms: Math.round(percentile(latencies, 0.95)),
      maxMs: Math.round(Math.max(...latencies)),
    },
    null,
    2,
  ),
);

if (errors > 0 || failedStatuses.length > 0) {
  process.exitCode = 1;
}
