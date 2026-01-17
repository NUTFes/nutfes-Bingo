/**
 * Complete REST API + Storage Load Test
 *
 * Tests: All data fetching including image downloads
 * - numbers (bingo numbers)
 * - prizes with images (prize data)
 * - reach_logs (reach count)
 * - Storage (actual image files)
 *
 * Target: 300-1000 concurrent users
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Configuration
const SUPABASE_URL = __ENV.SUPABASE_URL || "http://localhost:8000";
const ANON_KEY =
  __ENV.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY4NDQ2MjcwLCJleHAiOjE5MjYxMjYyNzB9.F1-eKyrx5hWJYUlXzO17K0PCAGILQwmOTCyCiyzjiws";

// Custom metrics
const numbersLatency = new Trend("numbers_fetch_ms");
const prizesLatency = new Trend("prizes_fetch_ms");
const reachLogsLatency = new Trend("reach_logs_fetch_ms");
const imageLatency = new Trend("image_fetch_ms");
const errorRate = new Rate("errors");
const imageErrors = new Counter("image_errors");
const imageSuccess = new Counter("image_success");

export const options = {
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.01"],
    numbers_fetch_ms: ["p(95)<1000"],
    prizes_fetch_ms: ["p(95)<1000"],
    image_fetch_ms: ["p(95)<2000"],
    errors: ["rate<0.02"],
  },
};

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

// Sample image URLs from the database (these will be fetched during init)
// For now, use known images from the database
const SAMPLE_IMAGES = [
  "bingo/1768486128897_character_orange_2.jpg",
  "bingo/1768486340399_00177-3119268918.png",
  "bingo/1768486355023_101373249_p0_master1200.jpg",
];

export default function completeTest() {
  // 1. Fetch bingo numbers
  const numbersStart = Date.now();
  const numbersRes = http.get(
    `${SUPABASE_URL}/rest/v1/numbers?select=id,number,created_at,updated_at&order=id.asc`,
    { headers, tags: { name: "fetch_numbers" } },
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

  // 2. Fetch prizes with image info
  const prizesStart = Date.now();
  const prizesRes = http.get(
    `${SUPABASE_URL}/rest/v1/prizes?select=id,is_won,image_id,name_jp,name_en,image:images(id,bucket_name,file_name)`,
    { headers, tags: { name: "fetch_prizes" } },
  );
  prizesLatency.add(Date.now() - prizesStart);

  const prizesOk = check(prizesRes, {
    "prizes: status 200": (r) => r.status === 200,
  });
  if (!prizesOk) errorRate.add(1);

  // 3. Fetch reach logs
  const reachStart = Date.now();
  const reachRes = http.get(
    `${SUPABASE_URL}/rest/v1/reach_logs?select=id,status,created_at,reach_num&order=created_at.desc&limit=1`,
    { headers, tags: { name: "fetch_reach_logs" } },
  );
  reachLogsLatency.add(Date.now() - reachStart);

  const reachOk = check(reachRes, {
    "reach_logs: status 200": (r) => r.status === 200,
  });
  if (!reachOk) errorRate.add(1);

  // 4. Fetch actual image from Storage (simulate loading prize images)
  // Pick a random sample image
  const randomImage =
    SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)];
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${randomImage}`;

  const imageStart = Date.now();
  const imageRes = http.get(imageUrl, {
    tags: { name: "fetch_image" },
    responseType: "binary", // Important for binary content
  });
  imageLatency.add(Date.now() - imageStart);

  const imageOk = check(imageRes, {
    "image: status 200": (r) => r.status === 200,
  });

  if (imageOk) {
    imageSuccess.add(1);
  } else {
    imageErrors.add(1);
    errorRate.add(1);
  }

  // Simulate user viewing page (think time)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: "Complete Load Test (REST API + Storage)",
    results: {
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      failedRequests: data.metrics.http_req_failed?.values?.passes || 0,

      // REST API latencies
      numbersP95:
        (data.metrics.numbers_fetch_ms?.values?.["p(95)"] || 0).toFixed(2) +
        "ms",
      prizesP95:
        (data.metrics.prizes_fetch_ms?.values?.["p(95)"] || 0).toFixed(2) +
        "ms",
      reachLogsP95:
        (data.metrics.reach_logs_fetch_ms?.values?.["p(95)"] || 0).toFixed(2) +
        "ms",

      // Storage/Image latencies
      imageP95:
        (data.metrics.image_fetch_ms?.values?.["p(95)"] || 0).toFixed(2) + "ms",
      imageSuccess: data.metrics.image_success?.values?.count || 0,
      imageErrors: data.metrics.image_errors?.values?.count || 0,

      // Overall
      overallP95:
        (data.metrics.http_req_duration?.values?.["p(95)"] || 0).toFixed(2) +
        "ms",
      errorRate:
        ((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2) + "%",
    },
  };

  console.log("\n========== Complete Load Test Summary ==========");
  console.log(`Total HTTP Requests: ${summary.results.totalRequests}`);
  console.log("");
  console.log("REST API Performance (p95):");
  console.log(`  - Numbers:    ${summary.results.numbersP95}`);
  console.log(`  - Prizes:     ${summary.results.prizesP95}`);
  console.log(`  - Reach Logs: ${summary.results.reachLogsP95}`);
  console.log("");
  console.log("Storage/Image Performance:");
  console.log(`  - Image p95:    ${summary.results.imageP95}`);
  console.log(`  - Successful:   ${summary.results.imageSuccess}`);
  console.log(`  - Errors:       ${summary.results.imageErrors}`);
  console.log("");
  console.log(`Overall Error Rate: ${summary.results.errorRate}`);
  console.log("=================================================\n");

  return {
    stdout: JSON.stringify(summary, null, 2) + "\n",
    "loadtest/results/complete-results.json": JSON.stringify(summary, null, 2),
  };
}
