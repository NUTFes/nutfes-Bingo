/**
 * Combined Load Test: REST API + WebSocket Realtime
 *
 * Simulates realistic user behavior:
 * 1. Initial page load (REST API fetch)
 * 2. WebSocket connection for realtime updates
 * 3. Periodic REST API refresh
 *
 * Target: 300-1000 concurrent users
 */

import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Configuration
const SUPABASE_URL = __ENV.SUPABASE_URL || "http://localhost:8000";
const WS_URL = SUPABASE_URL.replace("http://", "ws://").replace(
  "https://",
  "wss://"
);
const ANON_KEY =
  __ENV.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY4NDQ2MjcwLCJleHAiOjE5MjYxMjYyNzB9.F1-eKyrx5hWJYUlXzO17K0PCAGILQwmOTCyCiyzjiws";

// Custom metrics
const httpLatency = new Trend("http_latency");
const wsConnectTime = new Trend("ws_connect_time");
const wsErrors = new Rate("ws_errors");
const httpErrors = new Rate("http_errors");
const pageLoadTime = new Trend("page_load_time");

// Simpler test stages for combined test
export const options = {
  scenarios: {
    // Scenario 1: Users loading page and establishing WebSocket
    user_session: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 }, // Warm up
        { duration: "1m", target: 300 }, // Ramp to 300
        { duration: "2m", target: 300 }, // Sustain 300
        { duration: "1m", target: 500 }, // Ramp to 500
        { duration: "2m", target: 500 }, // Sustain 500
        { duration: "1m", target: 750 }, // Ramp to 750
        { duration: "2m", target: 750 }, // Sustain 750
        { duration: "1m", target: 1000 }, // Ramp to 1000
        { duration: "2m", target: 1000 }, // Sustain 1000
        { duration: "30s", target: 0 }, // Ramp down
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_latency: ["p(95)<1500"],
    ws_connect_time: ["p(95)<3000"],
    ws_errors: ["rate<0.05"],
    http_errors: ["rate<0.02"],
    page_load_time: ["p(95)<4000"],
  },
};

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

let messageRef = 0;
function getRef() {
  return String(++messageRef);
}

export default function () {
  const pageLoadStart = Date.now();

  // Phase 1: Initial page load (REST API calls)
  const results = fetchInitialData();

  if (!results.success) {
    httpErrors.add(1);
    return;
  }

  pageLoadTime.add(Date.now() - pageLoadStart);

  // Phase 2: Establish WebSocket for realtime updates
  const wsUrl = `${WS_URL}/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0`;
  const connectStart = Date.now();

  const wsRes = ws.connect(wsUrl, {}, function (socket) {
    wsConnectTime.add(Date.now() - connectStart);

    let heartbeatInterval = null;

    socket.on("open", function () {
      // Subscribe to numbers channel
      socket.send(
        JSON.stringify({
          topic: "realtime:public:numbers",
          event: "phx_join",
          payload: {
            config: {
              broadcast: { self: false },
              presence: { key: "" },
              postgres_changes: [
                { event: "*", schema: "public", table: "numbers" },
              ],
            },
          },
          ref: getRef(),
        })
      );

      // Subscribe to reach_logs channel
      socket.send(
        JSON.stringify({
          topic: "realtime:public:reach_logs",
          event: "phx_join",
          payload: {
            config: {
              broadcast: { self: false },
              presence: { key: "" },
              postgres_changes: [
                { event: "INSERT", schema: "public", table: "reach_logs" },
              ],
            },
          },
          ref: getRef(),
        })
      );

      // Heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        socket.send(
          JSON.stringify({
            topic: "phoenix",
            event: "heartbeat",
            payload: {},
            ref: getRef(),
          })
        );
      }, 30000);
    });

    socket.on("error", function (e) {
      wsErrors.add(1);
    });

    socket.on("close", function () {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    });

    // Simulate user session: stay connected for 30-60 seconds
    // During this time, occasionally refresh data
    const sessionDuration = 30 + Math.random() * 30;
    const refreshInterval = 10; // Refresh every 10 seconds

    let elapsed = 0;
    while (elapsed < sessionDuration) {
      sleep(Math.min(refreshInterval, sessionDuration - elapsed));
      elapsed += refreshInterval;

      // Periodic data refresh (simulating poll or user action)
      if (elapsed < sessionDuration) {
        const refreshStart = Date.now();
        const refreshRes = http.get(
          `${SUPABASE_URL}/rest/v1/reach_logs?select=id,reach_num&order=created_at.desc&limit=1`,
          { headers }
        );
        httpLatency.add(Date.now() - refreshStart);

        if (refreshRes.status !== 200) {
          httpErrors.add(1);
        }
      }
    }

    if (heartbeatInterval) clearInterval(heartbeatInterval);
    socket.close();
  });

  check(wsRes, {
    "WebSocket connected": (r) => r && r.status === 101,
  });
}

function fetchInitialData() {
  let success = true;

  // Fetch numbers
  const numbersStart = Date.now();
  const numbersRes = http.get(
    `${SUPABASE_URL}/rest/v1/numbers?select=id,number,created_at,updated_at&order=id.asc`,
    { headers }
  );
  httpLatency.add(Date.now() - numbersStart);

  if (!check(numbersRes, { "numbers fetch ok": (r) => r.status === 200 })) {
    success = false;
  }

  // Fetch prizes
  const prizesStart = Date.now();
  const prizesRes = http.get(
    `${SUPABASE_URL}/rest/v1/prizes?select=id,is_won,name_jp`,
    { headers }
  );
  httpLatency.add(Date.now() - prizesStart);

  if (!check(prizesRes, { "prizes fetch ok": (r) => r.status === 200 })) {
    success = false;
  }

  // Fetch latest reach log
  const reachStart = Date.now();
  const reachRes = http.get(
    `${SUPABASE_URL}/rest/v1/reach_logs?select=id,reach_num&order=created_at.desc&limit=1`,
    { headers }
  );
  httpLatency.add(Date.now() - reachStart);

  if (!check(reachRes, { "reach_logs fetch ok": (r) => r.status === 200 })) {
    success = false;
  }

  return { success };
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: "Combined Load Test (REST + WebSocket)",
    results: {
      // HTTP metrics
      totalHttpRequests: data.metrics.http_reqs?.values?.count || 0,
      httpP95Latency:
        data.metrics.http_latency?.values?.["p(95)"]?.toFixed(2) || 0,
      httpErrorRate:
        ((data.metrics.http_errors?.values?.rate || 0) * 100).toFixed(2) + "%",

      // WebSocket metrics
      wsP95ConnectTime:
        data.metrics.ws_connect_time?.values?.["p(95)"]?.toFixed(2) || 0,
      wsErrorRate:
        ((data.metrics.ws_errors?.values?.rate || 0) * 100).toFixed(2) + "%",

      // Page load metrics
      pageLoadP95:
        data.metrics.page_load_time?.values?.["p(95)"]?.toFixed(2) || 0,
    },
    thresholds: data.thresholds,
  };

  return {
    stdout: JSON.stringify(summary, null, 2) + "\n",
    "loadtest/results/combined-results.json": JSON.stringify(summary, null, 2),
  };
}
