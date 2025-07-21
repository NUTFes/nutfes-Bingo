/**
 * Artillery プロセッサー - 最適化されたユーザーシナリオ用
 * ビンゴアプリのユーザー閲覧機能に特化した負荷テスト処理
 */

const crypto = require("crypto");

// カスタムメトリクス
const metrics = {
  pageLoadTime: "page_load_time",
  apiResponseTime: "api_response_time",
  websocketConnectionTime: "websocket_connection_time",
};

/**
 * ランダムユーザーIDの生成
 */
function generateUserId(requestParams, context, ee, next) {
  context.vars.userId = `user_${Date.now()}_${Math.floor(
    Math.random() * 10000
  )}`;
  context.vars.uuid = crypto.randomUUID();
  return next();
}

/**
 * ページロード時間の測定
 */
function measurePageLoad(requestParams, context, ee, next) {
  const startTime = Date.now();
  context.vars.pageLoadStart = startTime;

  // カスタムメトリクスの記録
  ee.emit("counter", "page_requests", 1);
  return next();
}

/**
 * API応答時間の測定
 */
function measureApiResponse(requestParams, context, ee, next) {
  const responseTime =
    Date.now() - (context.vars.apiRequestStart || Date.now());
  ee.emit("histogram", metrics.apiResponseTime, responseTime);

  // GraphQLエラーのチェック
  if (context.vars.response && context.vars.response.errors) {
    ee.emit("counter", "graphql_errors", 1);
    console.log("GraphQL Error:", context.vars.response.errors);
  } else {
    ee.emit("counter", "successful_queries", 1);
  }

  return next();
}

/**
 * WebSocket接続時間の測定
 */
function measureWebSocketConnection(requestParams, context, ee, next) {
  const connectionTime =
    Date.now() - (context.vars.wsConnectionStart || Date.now());
  ee.emit("histogram", metrics.websocketConnectionTime, connectionTime);
  ee.emit("counter", "websocket_connections", 1);
  return next();
}

/**
 * 番号データの検証
 */
function validateNumbersData(requestParams, context, ee, next) {
  const numbers = context.vars.numbersData;

  if (!numbers || !Array.isArray(numbers)) {
    ee.emit("counter", "invalid_numbers_response", 1);
    console.log("Invalid numbers data:", numbers);
    return next();
  }

  // データの妥当性チェック
  const validNumbers = numbers.filter(
    (num) => num.id && typeof num.number === "number" && num.createdAt
  );

  ee.emit("counter", "valid_numbers_count", validNumbers.length);
  ee.emit("counter", "total_numbers_count", numbers.length);

  if (validNumbers.length !== numbers.length) {
    ee.emit("counter", "data_validation_errors", 1);
  }

  return next();
}

/**
 * 景品データの検証
 */
function validatePrizesData(requestParams, context, ee, next) {
  const prizes = context.vars.prizesData;

  if (!prizes || !Array.isArray(prizes)) {
    ee.emit("counter", "invalid_prizes_response", 1);
    console.log("Invalid prizes data:", prizes);
    return next();
  }

  // データの妥当性チェック
  const validPrizes = prizes.filter(
    (prize) => prize.id && prize.nameJp && typeof prize.isWon === "boolean"
  );

  ee.emit("counter", "valid_prizes_count", validPrizes.length);
  ee.emit("counter", "total_prizes_count", prizes.length);
  ee.emit("counter", "won_prizes_count", prizes.filter((p) => p.isWon).length);

  if (validPrizes.length !== prizes.length) {
    ee.emit("counter", "data_validation_errors", 1);
  }

  return next();
}

/**
 * 実際のユーザー行動パターンの追加
 */
function simulateUserBehavior(requestParams, context, ee, next) {
  // ランダムな待機時間（実際のユーザーの読み取り時間をシミュレート）
  const thinkTime = Math.random() * 3000 + 1000; // 1-4秒
  context.vars.thinkTime = thinkTime;

  // ページ切り替えの確率
  context.vars.switchPage = Math.random() < 0.3; // 30%の確率でページ切り替え

  // リロードの確率
  context.vars.refreshPage = Math.random() < 0.1; // 10%の確率でリロード

  ee.emit("counter", "user_interactions", 1);
  return next();
}

/**
 * エラーハンドリング
 */
function handleErrors(requestParams, context, ee, next) {
  if (context.vars.error) {
    ee.emit("counter", "scenario_errors", 1);
    console.log("Scenario error:", context.vars.error);
  }
  return next();
}

/**
 * リアルタイム接続の品質測定
 */
function measureRealtimeQuality(requestParams, context, ee, next) {
  const message = context.vars.wsMessage;

  if (message) {
    try {
      const parsedMessage = JSON.parse(message);

      switch (parsedMessage.type) {
        case "connection_ack":
          ee.emit("counter", "websocket_connections_established", 1);
          break;
        case "data":
          ee.emit("counter", "realtime_updates_received", 1);
          break;
        case "error":
          ee.emit("counter", "websocket_errors", 1);
          break;
        case "complete":
          ee.emit("counter", "subscriptions_completed", 1);
          break;
      }
    } catch (error) {
      ee.emit("counter", "websocket_parse_errors", 1);
    }
  }

  return next();
}

// 既存の関数も保持
function getUserId(requestParams, context, ee, next) {
  context.vars.userId = `user_${crypto.randomUUID()}`;
  return next();
}

function validateWebSocketMessage(requestParams, context, ee, next) {
  const message = context.vars.message;

  if (message) {
    try {
      const parsedMessage = JSON.parse(message);

      if (
        parsedMessage.type &&
        ["connection_ack", "data", "error", "complete"].includes(
          parsedMessage.type
        )
      ) {
        context.vars.messageValid = true;
      } else {
        context.vars.messageValid = false;
      }

      if (parsedMessage.payload && parsedMessage.payload.errors) {
        context.vars.hasErrors = true;
        console.error(
          "WebSocket GraphQL errors:",
          parsedMessage.payload.errors
        );
      } else {
        context.vars.hasErrors = false;
      }
    } catch (error) {
      context.vars.messageValid = false;
      context.vars.hasErrors = true;
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  return next();
}

// エクスポート
module.exports = {
  generateUserId,
  measurePageLoad,
  measureApiResponse,
  measureWebSocketConnection,
  validateNumbersData,
  validatePrizesData,
  simulateUserBehavior,
  handleErrors,
  measureRealtimeQuality,
  getUserId,
  validateWebSocketMessage,
};
