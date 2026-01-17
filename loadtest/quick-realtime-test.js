/**
 * Quick Realtime WebSocket Test v2
 *
 * Short sessions for quick scalability verification
 * Tests connection establishment and channel subscription
 */

import ws from "k6/ws";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

// Configuration
const SUPABASE_URL = __ENV.SUPABASE_URL || "http://localhost:8000";
const WS_URL = SUPABASE_URL.replace("http://", "ws://").replace(
  "https://",
  "wss://",
);
const ANON_KEY =
  __ENV.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY4NDQ2MjcwLCJleHAiOjE5MjYxMjYyNzB9.F1-eKyrx5hWJYUlXzO17K0PCAGILQwmOTCyCiyzjiws";

// Custom metrics
const wsConnectTime = new Trend("ws_connect_time_ms");
const wsSubscribeSuccess = new Counter("ws_subscribe_success");
const wsConnectionErrors = new Counter("ws_connection_errors");
const wsSessionsComplete = new Counter("ws_sessions_complete");

export const options = {
  thresholds: {
    ws_connect_time_ms: ["p(95)<3000"],
    checks: ["rate>0.95"], // 95% of checks should pass
  },
};

let messageRef = 0;
function getRef() {
  return String(++messageRef);
}

export default function quickRealtimeTest() {
  const url = `${WS_URL}/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0`;

  const connectStart = Date.now();

  const res = ws.connect(
    url,
    { tags: { name: "realtime" } },
    function (socket) {
      const connectDuration = Date.now() - connectStart;
      wsConnectTime.add(connectDuration);

      socket.on("open", function () {
        // Join numbers channel
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
          }),
        );
      });

      socket.on("message", function (message) {
        try {
          const data = JSON.parse(message);
          if (data.event === "phx_reply" && data.payload?.status === "ok") {
            wsSubscribeSuccess.add(1);
          }
        } catch {
          // ignore non-JSON
        }
      });

      socket.on("error", function () {
        wsConnectionErrors.add(1);
      });

      socket.on("close", function () {
        wsSessionsComplete.add(1);
      });

      // Short session: 5-10 seconds
      sleep(5 + Math.random() * 5);
      socket.close();
    },
  );

  const connected = check(res, {
    "WebSocket connected": (r) => r && r.status === 101,
  });

  if (!connected) {
    wsConnectionErrors.add(1);
  }
}

export function handleSummary(data) {
  const connectTimeP95 =
    data.metrics.ws_connect_time_ms?.values?.["p(95)"] || 0;
  const sessions = data.metrics.ws_sessions_complete?.values?.count || 0;
  const subscriptions = data.metrics.ws_subscribe_success?.values?.count || 0;
  const errors = data.metrics.ws_connection_errors?.values?.count || 0;
  const checksRate = data.metrics.checks?.values?.rate || 0;

  console.log("\n========== WebSocket Test Summary ==========");
  console.log(`Total sessions completed: ${sessions}`);
  console.log(`Successful subscriptions: ${subscriptions}`);
  console.log(`Connection errors: ${errors}`);
  console.log(`Connect time p95: ${connectTimeP95.toFixed(2)}ms`);
  console.log(`Check success rate: ${(checksRate * 100).toFixed(2)}%`);
  console.log("=============================================\n");

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
