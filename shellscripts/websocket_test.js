import ws from "k6/ws";
import http from "k6/http";
import { check, sleep } from "k6";

// === テストオプション ===
export const options = {
  vus: 100, // 仮想ユーザー数
  duration: "1m", // テスト時間
};

// === 共通設定 ===
const GRAPHQL_HTTP_URL = "http://bingo_api:8080/v1/graphql";
const GRAPHQL_WS_URL = "ws://bingo_api:8080/v1/graphql";
const HEADERS = {
  "Content-Type": "application/json",
};

// === テストデータを事前に挿入 ===
export function setup() {
  const values = Array.from(
    { length: 50 },
    (_, i) => `{ number: ${i + 1} }`
  ).join(", ");
  const mutation = `
    mutation {
      insert_numbers(objects: [${values}]) {
        affected_rows
      }
    }
  `;

  const res = http.post(GRAPHQL_HTTP_URL, JSON.stringify({ query: mutation }), {
    headers: HEADERS,
  });

  check(res, {
    "✅ Data inserted successfully": (r) =>
      r.status === 200 && !r.json().errors,
  });

  console.log("==> Inserted 50 test rows.");
}

// === WebSocket subscription 負荷テスト ===
export default function () {
  const res = ws.connect(
    GRAPHQL_WS_URL,
    {
      headers: {
        "Sec-WebSocket-Protocol": "graphql-ws", // ✅ Hasuraは graphql-ws 対応
      },
    },
    function (socket) {
      socket.on("open", () => {
        // 接続初期化
        socket.send(JSON.stringify({ type: "connection_init", payload: {} }));

        // subscription 開始
        socket.send(
          JSON.stringify({
            id: "1",
            type: "start",
            payload: {
              query: `
                subscription {
                  numbers {
                    id
                    number
                    created_at
                  }
                }
              `,
            },
          })
        );

        // メッセージを受け取ったらログ出力
        socket.on("message", (msg) => {
          console.log(`📨 Received: ${msg}`);
        });

        // 3秒後に切断
        socket.setTimeout(() => {
          socket.send(JSON.stringify({ type: "stop", id: "1" }));
          socket.close();
        }, 3000);
      });

      socket.on("close", () => {
        console.log("❎ WebSocket closed");
      });

      socket.on("error", (e) => {
        console.error("❌ WebSocket error:", e.error());
      });
    }
  );

  check(res, {
    "✅ WebSocket connected": (r) => {
      if (!r || r.status !== 101) {
        console.error(
          "❌ WebSocket failed to connect. Response:",
          JSON.stringify(r, null, 2)
        );
        return false;
      }
      return true;
    },
  });

  sleep(1);
}

// === 実行後に結果をファイルに保存（Metabase用など）===
export function handleSummary(data) {
  return {
    "/tmp/result.json": JSON.stringify(data),
    stdout: JSON.stringify(data.metrics, null, 2),
  };
}
