const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:8000";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY4NDQ2MjcwLCJleHAiOjE5MjYxMjYyNzB9.F1-eKyrx5hWJYUlXzO17K0PCAGILQwmOTCyCiyzjiws";

const TOTAL_CLIENTS = parseInt(process.argv[2] || "100", 10);
const RAMP_UP_INTERVAL = 10; // ms between connections

console.log(`Starting test with ${TOTAL_CLIENTS} clients...`);

let connectedCount = 0;
let errorCount = 0;
let closedCount = 0;

async function start() {
  const clients = [];

  for (let i = 0; i < TOTAL_CLIENTS; i++) {
    setTimeout(async () => {
      try {
        const client = createClient(SUPABASE_URL, ANON_KEY, {
          active: false, // Do not rely on window visibility
        });

        const channel = client.channel("public:stress_test");

        channel.subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            connectedCount++;
            updateStatus();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            errorCount++;
            updateStatus();
            if (err) console.error("\nError detail:", err);
          } else if (status === "CLOSED") {
            closedCount++;
            updateStatus();
          }
        });

        clients.push({ client, channel });
      } catch (e) {
        console.error("\nException:", e);
      }
    }, i * RAMP_UP_INTERVAL);
  }
}

function updateStatus() {
  process.stdout.write(
    `\rConnected: ${connectedCount} | Errors: ${errorCount} | Closed: ${closedCount}`,
  );
}

start();

// Keep alive
setInterval(() => {
  updateStatus();
}, 1000);
