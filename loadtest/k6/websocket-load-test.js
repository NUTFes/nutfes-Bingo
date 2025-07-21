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

// 負荷テストの設定
export const options = {
  stages: [
    { duration: "10s", target: performanceTargets.loadSteps.warmup.users },
    { duration: "10s", target: performanceTargets.loadSteps.normal.users },
    { duration: "10s", target: performanceTargets.loadSteps.peak.users },
    { duration: "10s", target: performanceTargets.loadSteps.stress.users },
    { duration: "10s", target: 0 },
  ],
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
    subscription_success: ["rate>0.95"],
  },
};

// 環境設定の取得
const ENV = __ENV.ENVIRONMENT || "local";
const config = environments[ENV];

// WebSocket接続とサブスクリプションのテスト
export default function () {
  const userId = `user_${__VU}_${__ITER}`;
  const url = config.wsEndpoint;

  console.log(`User ${userId} connecting to ${url}`);

  const connectionStart = Date.now();

  const res = ws.connect(
    url,
    {
      protocols: ["graphql-transport-ws"],
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
        console.error(`Connection failed for user ${userId}`);
        return;
      }

      connectionErrors.add(0);

      // GraphQL WebSocket プロトコルの初期化（graphql-transport-ws）
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

      let initAcknowledged = false;
      let numbersSubscriptionId = null;
      let prizesSubscriptionId = null;
      let messageCounter = 0;
      let lastMessageTime = Date.now();

      socket.on("message", function (message) {
        const currentTime = Date.now();
        messageLatency.add(currentTime - lastMessageTime);
        messagesReceived.add(1);
        messageCounter++;

        try {
          const data = JSON.parse(message);

          // メッセージタイプ別の処理
          if (data.type === "connection_ack") {
            initAcknowledged = true;
            console.log(`User ${userId}: Connection acknowledged`);

            // 番号のサブスクリプション開始
            numbersSubscriptionId = `numbers_${userId}_${Date.now()}`;
            socket.send(
              JSON.stringify({
                id: numbersSubscriptionId,
                type: "subscribe",
                payload: {
                  query: graphqlQueries.subscribeBingoNumbers,
                },
              })
            );

            // 景品のサブスクリプション開始
            prizesSubscriptionId = `prizes_${userId}_${Date.now()}`;
            socket.send(
              JSON.stringify({
                id: prizesSubscriptionId,
                type: "subscribe",
                payload: {
                  query: graphqlQueries.subscribePrizesIsWon,
                },
              })
            );
          } else if (data.type === "next") {
            // サブスクリプションデータの検証（graphql-transport-ws では "next"）
            const dataValid = check(data, {
              "Subscription data is valid": (d) =>
                d.payload && d.payload.data && !d.payload.errors,
              "Contains expected fields": (d) => {
                const payload = d.payload.data;
                return (
                  (payload.numbers && Array.isArray(payload.numbers)) ||
                  (payload.prizes && Array.isArray(payload.prizes))
                );
              },
            });

            if (dataValid) {
              subscriptionSuccess.add(1);
              messageErrors.add(0);
            } else {
              subscriptionSuccess.add(0);
              messageErrors.add(1);
              console.error(`Invalid data for user ${userId}:`, data);
            }
          } else if (data.type === "error") {
            messageErrors.add(1);
            subscriptionSuccess.add(0);
            console.error(`Subscription error for user ${userId}:`, data);
          } else if (data.type === "complete") {
            console.log(`Subscription completed for user ${userId}`);
          }
        } catch (error) {
          messageErrors.add(1);
          console.error(
            `Message parsing error for user ${userId}:`,
            error.message
          );
        }

        lastMessageTime = currentTime;
      });

      socket.on("error", function (error) {
        connectionErrors.add(1);
        console.error(`WebSocket error for user ${userId}:`, error);
      });

      socket.on("close", function () {
        console.log(`Connection closed for user ${userId}`);
      });

      // 接続維持とテストシナリオ
      let testDuration = 0;
      const maxTestDuration = 180; // 3分間の接続維持

      const keepAliveInterval = setInterval(() => {
        if (socket.readyState === 1) {
          // OPEN state
          // 定期的なping送信
          socket.ping();
          testDuration += 5;

          // テスト完了条件
          if (testDuration >= maxTestDuration) {
            // サブスクリプション停止
            if (numbersSubscriptionId) {
              socket.send(
                JSON.stringify({
                  id: numbersSubscriptionId,
                  type: "complete",
                })
              );
            }
            if (prizesSubscriptionId) {
              socket.send(
                JSON.stringify({
                  id: prizesSubscriptionId,
                  type: "complete",
                })
              );
            }

            // 接続終了
            socket.close();
            clearInterval(keepAliveInterval);
          }
        } else {
          clearInterval(keepAliveInterval);
        }
      }, 5000); // 5秒ごとにチェック

      // 初期化タイムアウトチェック
      setTimeout(() => {
        if (!initAcknowledged) {
          connectionErrors.add(1);
          console.error(`Connection init timeout for user ${userId}`);
          socket.close();
        }
      }, 10000); // 10秒のタイムアウト
    }
  );

  // 接続失敗の場合
  check(res, {
    "WebSocket connection successful": (r) => r && r.status === 101,
  }) || connectionErrors.add(1);

  // ユーザー間の接続間隔をシミュレート
  sleep(Math.random() * 2 + 1); // 1-3秒の待機
}

// セットアップ関数
export function setup() {
  console.log(`🌐 WebSocket負荷テスト開始 - 環境: ${ENV}`);
  console.log(`📍 WebSocket エンドポイント: ${config.wsEndpoint}`);

  return { startTime: Date.now() };
}

// 終了処理
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`✅ WebSocket負荷テスト完了 - 実行時間: ${duration}秒`);
}
