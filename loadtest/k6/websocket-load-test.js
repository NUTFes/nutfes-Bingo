import ws from "k6/ws";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import {
  environments,
  performanceTargets,
  graphqlQueries,
} from "../config/environments.js";

// カスタムメトリクス
const connectionTime = new Trend("websocket_connection_time");
const messageLatency = new Trend("websocket_message_latency");
const connectionErrors = new Rate("websocket_connection_errors");
const messageErrors = new Rate("websocket_message_errors");
const messagesReceived = new Counter("websocket_messages_received");

// 負荷テストの設定
export const options = {
  stages: (() => {
    const maxUsers = parseInt(__ENV.MAX_USERS || "500");
    const scaledSteps =
      performanceTargets.maxUsers.getScaledLoadSteps(maxUsers);

    return [
      { duration: "30s", target: scaledSteps.warmup.users }, // ウォームアップ
      { duration: "30s", target: scaledSteps.normal.users }, // 通常負荷
      { duration: "30s", target: scaledSteps.peak.users }, // ピーク負荷
      { duration: "30s", target: scaledSteps.stress.users }, // ストレス負荷
      { duration: "30s", target: 0 }, // クールダウン
    ];
  })(),
  thresholds: {
    websocket_connection_time: [
      `p(95)<${performanceTargets.websocket.connectionTime}`,
    ],
    websocket_message_latency: [
      `p(95)<${performanceTargets.websocket.messageLatency}`,
    ],
    websocket_connection_errors: [
      `rate<${performanceTargets.errorRate.max / 100}`,
    ],
    websocket_message_errors: [
      `rate<${performanceTargets.errorRate.max / 100}`,
    ],
  },
};

// 環境設定の取得
const ENV = __ENV.ENVIRONMENT || "local";
const config = environments[ENV];

export default function () {
  const userId = `user_${__VU}_${__ITER}`;
  const url = config.wsEndpoint;

  const connectionStart = Date.now();

  const res = ws.connect(
    url,
    {
      protocols: ["graphql-transport-ws", "graphql-ws"],
      headers: {
        "Sec-WebSocket-Protocol": "graphql-transport-ws",
      },
    },
    function (socket) {
      const connectionEnd = Date.now();
      connectionTime.add(connectionEnd - connectionStart);

      // WebSocket接続の検証
      const connectionSuccess = check(socket, {
        "WebSocket connection established": (s) => s !== null,
      });

      if (!connectionSuccess) {
        connectionErrors.add(1);
        return;
      }

      connectionErrors.add(0);

      // GraphQL WebSocket プロトコルの初期化
      socket.send(
        JSON.stringify({
          type: "connection_init",
          payload: {
            headers: {
              "x-hasura-admin-secret": config.adminSecret,
            },
          },
        })
      );

      let messageCounter = 0;
      let lastMessageTime = Date.now();

      socket.on("message", function (message) {
        const currentTime = Date.now();
        messageLatency.add(currentTime - lastMessageTime);
        messagesReceived.add(1);
        messageCounter++;

        try {
          const data = JSON.parse(message);

          const messageSuccess = check(data, {
            "Message format is valid": (d) => d.type !== undefined,
            "No GraphQL errors": (d) => !d.payload?.errors,
          });

          if (!messageSuccess) {
            messageErrors.add(1);
          } else {
            messageErrors.add(0);
          }

          // connection_ack を受信したらサブスクリプションを開始
          if (data.type === "connection_ack") {
            // ビンゴ番号のサブスクリプション
            socket.send(
              JSON.stringify({
                id: `bingo_numbers_${userId}`,
                type: "start",
                payload: {
                  query: graphqlQueries.subscribeBingoNumbers,
                },
              })
            );

            // 景品情報のサブスクリプション
            socket.send(
              JSON.stringify({
                id: `prizes_${userId}`,
                type: "start",
                payload: {
                  query: graphqlQueries.subscribePrizes,
                },
              })
            );
          }

          lastMessageTime = currentTime;
        } catch (e) {
          messageErrors.add(1);
          console.error("Failed to parse WebSocket message:", e);
        }
      });

      socket.on("error", function (e) {
        connectionErrors.add(1);
        console.error("WebSocket error:", e);
      });

      // WebSocket接続を一定時間維持
      const testDuration = Math.random() * 30 + 30; // 30-60秒
      sleep(testDuration);

      // サブスクリプションの停止
      socket.send(
        JSON.stringify({
          id: `bingo_numbers_${userId}`,
          type: "stop",
        })
      );

      socket.send(
        JSON.stringify({
          id: `prizes_${userId}`,
          type: "stop",
        })
      );

      // 接続終了
      socket.send(
        JSON.stringify({
          type: "connection_terminate",
        })
      );

      socket.close();

      check(messageCounter, {
        "Received at least one message": (count) => count > 0,
      });
    }
  );

  check(res, {
    "WebSocket handshake successful": (r) => r && r.status === 101,
  });

  if (!res || res.status !== 101) {
    connectionErrors.add(1);
  }

  sleep(1);
}
