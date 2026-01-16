/**
 * REST API Load Test for Supabase Bingo Application
 *
 * Tests: Initial data fetch performance (numbers, prizes, reach_logs)
 * Target: 300-1000 concurrent users
 *
 * Usage:
 *   k6 run rest-api-test.js                    # Default (100 VUs)
 *   k6 run --vus 300 --duration 2m rest-api-test.js   # 300 concurrent
 *   k6 run --vus 1000 --duration 5m rest-api-test.js  # 1000 concurrent
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Configuration
const SUPABASE_URL = __ENV.SUPABASE_URL || "http://localhost:8000";
const ANON_KEY =
  __ENV.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY4NDQ2MjcwLCJleHAiOjE5MjYxMjYyNzB9.F1-eKyrx5hWJYUlXzO17K0PCAGILQwmOTCyCiyzjiws";

// Custom metrics
const numbersLatency = new Trend("numbers_fetch_duration");
const prizesLatency = new Trend("prizes_fetch_duration");
const reachLogsLatency = new Trend("reach_logs_fetch_duration");
const errorRate = new Rate("errors");

// Test stages: Ramp up to target, sustain, ramp down
export const options = {
  stages: [
    { duration: "30s", target: 100 }, // Warm up
    { duration: "1m", target: 300 }, // Ramp to 300 users
    { duration: "2m", target: 300 }, // Sustain 300 users
    { duration: "1m", target: 500 }, // Ramp to 500 users
    { duration: "2m", target: 500 }, // Sustain 500 users
    { duration: "1m", target: 750 }, // Ramp to 750 users
    { duration: "2m", target: 750 }, // Sustain 750 users
    { duration: "1m", target: 1000 }, // Ramp to 1000 users
    { duration: "2m", target: 1000 }, // Sustain 1000 users
    { duration: "30s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.01"],
    numbers_fetch_duration: ["p(95)<1500"],
    prizes_fetch_duration: ["p(95)<1500"],
    reach_logs_fetch_duration: ["p(95)<1000"],
    errors: ["rate<0.02"],
  },
};

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

// Simulate initial page load - fetch all necessary data
export default function () {
  // 1. Fetch bingo numbers (main data)
  const numbersStart = Date.now();
  const numbersRes = http.get(
    `${SUPABASE_URL}/rest/v1/numbers?select=id,number,created_at,updated_at&order=id.asc`,
    { headers }
  );
  numbersLatency.add(Date.now() - numbersStart);

  const numbersOk = check(numbersRes, {
    "numbers: status 200": (r) => r.status === 200,
    "numbers: is array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
  });
  if (!numbersOk) errorRate.add(1);

  // 2. Fetch prizes with images
  const prizesStart = Date.now();
  const prizesRes = http.get(
    `${SUPABASE_URL}/rest/v1/prizes?select=id,is_won,image_id,name_jp,name_en,created_at,updated_at,image:images(id,bucket_name,file_name,file_type)`,
    { headers }
  );
  prizesLatency.add(Date.now() - prizesStart);

  const prizesOk = check(prizesRes, {
    "prizes: status 200": (r) => r.status === 200,
    "prizes: is array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
  });
  if (!prizesOk) errorRate.add(1);

  // 3. Fetch latest reach log
  const reachStart = Date.now();
  const reachRes = http.get(
    `${SUPABASE_URL}/rest/v1/reach_logs?select=id,status,created_at,reach_num&order=created_at.desc&limit=1`,
    { headers }
  );
  reachLogsLatency.add(Date.now() - reachStart);

  const reachOk = check(reachRes, {
    "reach_logs: status 200": (r) => r.status === 200,
  });
  if (!reachOk) errorRate.add(1);

  // Simulate user viewing page (think time)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: "REST API Load Test",
    results: {
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      failedRequests: data.metrics.http_req_failed?.values?.passes || 0,
      avgDuration: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0,
      p95Duration:
        data.metrics.http_req_duration?.values?.["p(95)"]?.toFixed(2) || 0,
      p99Duration:
        data.metrics.http_req_duration?.values?.["p(99)"]?.toFixed(2) || 0,
      numbersP95:
        data.metrics.numbers_fetch_duration?.values?.["p(95)"]?.toFixed(2) || 0,
      prizesP95:
        data.metrics.prizes_fetch_duration?.values?.["p(95)"]?.toFixed(2) || 0,
      reachLogsP95:
        data.metrics.reach_logs_fetch_duration?.values?.["p(95)"]?.toFixed(2) ||
        0,
    },
    thresholds: data.thresholds,
  };

  return {
    stdout: JSON.stringify(summary, null, 2) + "\n",
    "loadtest/results/rest-api-results.json": JSON.stringify(summary, null, 2),
  };
}
