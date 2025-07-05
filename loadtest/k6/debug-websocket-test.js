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
const subscriptionSuccess = new Rate("subscription_success");

// デバッグ用の軽い負荷設定
export const options = {
  stages: [
    { duration: "10s", target: 1 }, // 1ユーザーで開始
    { duration: "10s", target: 5 }, // 5ユーザーに増加
    { duration: "10s", target: 0 }, // 終了
  ],
  thresholds: {
    websocket_connection_time: ["p(95)<2000"], // より緩い閾値
    websocket_message_latency: ["p(95)<200"],
    websocket_connection_errors: ["rate<0.1"],
    websocket_message_errors: ["rate<0.1"],
    subscription_success: ["rate>0.5"], // より緩い成功率
  },
};

// 環境設定の取得
const ENV = __ENV.ENVIRONMENT || "local";
const config = environments[ENV];

export default function () {
  const userId = `debug_user_${__VU}_${__ITER}`;
  const url = config.wsEndpoint;

  console.log(`🔗 User ${userId} connecting to ${url}`);

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
      const connTime = connectionEnd - connectionStart;
      connectionTime.add(connTime);

      console.log(`✅ User ${userId} connected in ${connTime}ms`);

      // WebSocket接続の検証
      const connectionSuccess = check(socket, {
        "WebSocket connection established": (s) => s !== null,
      });

      if (!connectionSuccess) {
        connectionErrors.add(1);
        console.error(`❌ Connection failed for user ${userId}`);
        return;
      }

      connectionErrors.add(0);

      // GraphQL WebSocket プロトコルの初期化
      const initMessage = {
        type: "connection_init",
        payload: {
          headers: {
            // Production環境では管理者秘密鍵が必要
            "x-hasura-admin-secret": config.adminSecret,
          },
        },
      };

      console.log(
        `📤 User ${userId} sending init:`,
        JSON.stringify(initMessage)
      );
      socket.send(JSON.stringify(initMessage));

      let initAcknowledged = false;
      let subscriptionStarted = false;
      let messageCounter = 0;
      let lastMessageTime = Date.now();

      socket.on("message", function (message) {
        const currentTime = Date.now();
        messageLatency.add(currentTime - lastMessageTime);
        messagesReceived.add(1);
        messageCounter++;

        console.log(
          `📥 User ${userId} received message #${messageCounter}:`,
          message.substring(0, 100)
        );

        try {
          const data = JSON.parse(message);

          // メッセージタイプ別の処理
          if (data.type === "ping") {
            // Pingに対してPongで応答
            const pongMessage = { type: "pong", payload: data.payload };
            socket.send(JSON.stringify(pongMessage));
            console.log(`🏓 User ${userId}: Responded to ping with pong`);
          } else if (data.type === "connection_ack") {
            initAcknowledged = true;
            console.log(`✅ User ${userId}: Connection acknowledged`);

            // 番号のサブスクリプション開始（デバッグ用に1つだけ）
            if (!subscriptionStarted) {
              subscriptionStarted = true;
              const subscriptionId = `numbers_${userId}`;
              const subscriptionMessage = {
                id: subscriptionId,
                type: "subscribe",
                payload: {
                  query: graphqlQueries.subscribeBingoNumbers,
                },
              };

              console.log(
                `📤 User ${userId} starting subscription:`,
                JSON.stringify(subscriptionMessage)
              );
              socket.send(JSON.stringify(subscriptionMessage));
            }
          } else if (data.type === "next" || data.type === "data") {
            // サブスクリプションデータの検証
            console.log(
              `📊 User ${userId} received data:`,
              JSON.stringify(data, null, 2)
            );

            const dataValid = check(data, {
              "Subscription data is valid": (d) =>
                d.payload && d.payload.data && !d.payload.errors,
              "Contains numbers data": (d) => {
                const payload = d.payload.data;
                return payload.numbers && Array.isArray(payload.numbers);
              },
            });

            if (dataValid) {
              subscriptionSuccess.add(1);
              messageErrors.add(0);
              console.log(
                `✅ User ${userId}: Valid data received, numbers count: ${data.payload.data.numbers.length}`
              );
            } else {
              subscriptionSuccess.add(0);
              messageErrors.add(1);
              console.error(`❌ User ${userId}: Invalid data received`);
            }
          } else if (data.type === "error") {
            messageErrors.add(1);
            subscriptionSuccess.add(0);
            console.error(
              `❌ User ${userId}: Subscription error:`,
              JSON.stringify(data, null, 2)
            );
          } else if (data.type === "complete") {
            console.log(`🏁 User ${userId}: Subscription completed`);
          } else {
            console.log(
              `❓ User ${userId}: Unknown message type: ${data.type}`,
              JSON.stringify(data, null, 2)
            );
          }
        } catch (error) {
          messageErrors.add(1);
          console.error(
            `❌ User ${userId}: Message parsing error:`,
            error.message
          );
          console.error(`Raw message:`, message);
        }

        lastMessageTime = currentTime;
      });

      socket.on("error", function (error) {
        connectionErrors.add(1);
        console.error(`❌ User ${userId}: WebSocket error:`, error);
      });

      socket.on("close", function () {
        console.log(
          `🔌 User ${userId}: Connection closed, received ${messageCounter} messages`
        );
      });

      // 初期化タイムアウトチェック
      setTimeout(() => {
        if (!initAcknowledged) {
          connectionErrors.add(1);
          console.error(`⏰ User ${userId}: Connection init timeout (10s)`);
          socket.close();
        }
      }, 10000);

      // テスト期間（30秒間接続維持）
      setTimeout(() => {
        console.log(
          `⏰ User ${userId}: Test duration completed, closing connection`
        );
        socket.close();
      }, 30000);
    }
  );

  // 接続失敗の場合
  const connectResult = check(res, {
    "WebSocket connection attempt successful": (r) => r && r.status === 101,
  });

  if (!connectResult) {
    connectionErrors.add(1);
    console.error(
      `❌ User ${userId}: Failed to establish WebSocket connection`
    );
  }

  // 次のユーザー接続まで少し待機
  sleep(1);
}

// セットアップ関数
export function setup() {
  console.log(`🐛 WebSocketデバッグテスト開始 - 環境: ${ENV}`);
  console.log(`📍 WebSocket エンドポイント: ${config.wsEndpoint}`);
  console.log(
    `🔍 使用するクエリ:`,
    graphqlQueries.subscribeBingoNumbers.trim()
  );

  return { startTime: Date.now() };
}

// 終了処理
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`🏁 WebSocketデバッグテスト完了 - 実行時間: ${duration}秒`);
}
