// Load Test Configuration for Supabase Bingo Application
// Target: 300-1000 concurrent connections

export const CONFIG = {
  // Supabase connection settings
  supabase: {
    url: "http://localhost:8000",
    wsUrl: "ws://localhost:8000/realtime/v1/websocket",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY4NDQ2MjcwLCJleHAiOjE5MjYxMjYyNzB9.F1-eKyrx5hWJYUlXzO17K0PCAGILQwmOTCyCiyzjiws",
  },

  // Test thresholds (event usage standards)
  thresholds: {
    // REST API
    http_req_duration_p95: 2000, // 95% of requests < 2s
    http_req_duration_p99: 5000, // 99% of requests < 5s
    http_req_failed_rate: 0.01, // Error rate < 1%

    // WebSocket
    ws_connecting_p95: 3000, // 95% connect < 3s
    ws_session_duration_min: 60000, // Sessions last at least 60s
  },

  // Tables to test
  tables: {
    numbers: "numbers",
    prizes: "prizes",
    reachLogs: "reach_logs",
    stampTriggers: "stamp_triggers",
    events: "events",
  },

  // Realtime channels
  channels: [
    { name: "numbers-changes", table: "numbers", event: "*" },
    { name: "reach-logs-changes", table: "reach_logs", event: "INSERT" },
    {
      name: "stamp-triggers-changes",
      table: "stamp_triggers",
      event: "INSERT",
    },
  ],
};

export default CONFIG;
