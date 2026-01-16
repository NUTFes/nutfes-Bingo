/**
 * Supabase Realtime WebSocket Load Test
 *
 * Tests: WebSocket connections and Realtime subscriptions
 * Target: 300-1000 concurrent WebSocket connections
 *
 * Usage:
 *   k6 run realtime-test.js                           # Default stages
 *   k6 run --vus 300 --duration 3m realtime-test.js   # 300 concurrent
 *   k6 run --vus 1000 --duration 5m realtime-test.js  # 1000 concurrent
 */

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
const wsConnectTime = new Trend("ws_connect_time");
const wsMessageReceived = new Counter("ws_messages_received");
const wsErrors = new Rate("ws_errors");
const wsConnectionsActive = new Counter("ws_connections_active");
const wsSubscribeTime = new Trend("ws_subscribe_time");

// Test stages
export const options = {
  stages: [
    { duration: "20s", target: 50 }, // Warm up
    { duration: "30s", target: 150 }, // Ramp to 150
    { duration: "1m", target: 300 }, // Ramp to 300
    { duration: "2m", target: 300 }, // Sustain 300
    { duration: "1m", target: 500 }, // Ramp to 500
    { duration: "2m", target: 500 }, // Sustain 500
    { duration: "1m", target: 750 }, // Ramp to 750
    { duration: "1m30s", target: 750 }, // Sustain 750
    { duration: "1m", target: 1000 }, // Ramp to 1000
    { duration: "2m", target: 1000 }, // Sustain 1000
    { duration: "30s", target: 0 }, // Ramp down
  ],
  thresholds: {
    ws_connect_time: ["p(95)<3000", "p(99)<5000"],
    ws_errors: ["rate<0.05"],
    ws_subscribe_time: ["p(95)<1000"],
  },
};

// Generate unique ref for each message
let messageRef = 0;
function getRef() {
  return String(++messageRef);
}

export default function () {
  const url = `${WS_URL}/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0`;

  const connectStart = Date.now();

  const res = ws.connect(url, {}, function (socket) {
    const connectDuration = Date.now() - connectStart;
    wsConnectTime.add(connectDuration);
    wsConnectionsActive.add(1);

    let joinedChannels = 0;
    let heartbeatInterval = null;

    socket.on("open", function () {
      // Subscribe to multiple channels (simulating real user behavior)
      const channels = [
        { topic: "realtime:public:numbers", event: "*" },
        { topic: "realtime:public:reach_logs", event: "INSERT" },
        { topic: "realtime:public:stamp_triggers", event: "INSERT" },
      ];

      channels.forEach((channel, index) => {
        const subscribeStart = Date.now();

        // Join channel
        socket.send(
          JSON.stringify({
            topic: channel.topic,
            event: "phx_join",
            payload: {
              config: {
                broadcast: { self: false },
                presence: { key: "" },
                postgres_changes: [
                  {
                    event: channel.event,
                    schema: "public",
                    table: channel.topic.split(":")[2],
                  },
                ],
              },
            },
            ref: getRef(),
          })
        );

        wsSubscribeTime.add(Date.now() - subscribeStart);
      });

      // Send heartbeat every 30 seconds to keep connection alive
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

    socket.on("message", function (message) {
      wsMessageReceived.add(1);

      try {
        const data = JSON.parse(message);

        // Track successful channel joins
        if (data.event === "phx_reply" && data.payload?.status === "ok") {
          joinedChannels++;
        }

        // Handle postgres_changes events
        if (data.event === "postgres_changes") {
          // Successfully received a realtime update
          wsMessageReceived.add(1);
        }
      } catch (e) {
        // Non-JSON message, ignore
      }
    });

    socket.on("error", function (e) {
      wsErrors.add(1);
      console.error("WebSocket error:", e);
    });

    socket.on("close", function () {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    });

    // Keep connection open for 60-120 seconds (simulate user session)
    const sessionDuration = 60 + Math.random() * 60;
    sleep(sessionDuration);

    // Clean up
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    socket.close();
  });

  const connected = check(res, {
    "WebSocket connected": (r) => r && r.status === 101,
  });

  if (!connected) {
    wsErrors.add(1);
  }
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: "WebSocket Realtime Load Test",
    results: {
      totalConnections: data.metrics.ws_connecting?.values?.count || 0,
      avgConnectTime:
        data.metrics.ws_connect_time?.values?.avg?.toFixed(2) || 0,
      p95ConnectTime:
        data.metrics.ws_connect_time?.values?.["p(95)"]?.toFixed(2) || 0,
      p99ConnectTime:
        data.metrics.ws_connect_time?.values?.["p(99)"]?.toFixed(2) || 0,
      messagesReceived: data.metrics.ws_messages_received?.values?.count || 0,
      errorRate:
        (data.metrics.ws_errors?.values?.rate * 100)?.toFixed(2) + "%" || "0%",
      avgSubscribeTime:
        data.metrics.ws_subscribe_time?.values?.avg?.toFixed(2) || 0,
    },
    thresholds: data.thresholds,
  };

  return {
    stdout: JSON.stringify(summary, null, 2) + "\n",
    "loadtest/results/realtime-results.json": JSON.stringify(summary, null, 2),
  };
}
