const crypto = require("crypto");

// ユーザーIDを生成
function getUserId(requestParams, context, ee, next) {
  // ユニークなユーザーIDを生成
  context.vars.userId = `user_${crypto.randomUUID()}`;

  return next();
}

// WebSocketメッセージの検証
function validateWebSocketMessage(requestParams, context, ee, next) {
  // WebSocketメッセージの妥当性を検証
  const message = context.vars.message;

  if (message) {
    try {
      const parsedMessage = JSON.parse(message);

      // GraphQL WebSocketプロトコルの検証
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

      // エラーチェック
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

// レスポンス時間を測定
function measureResponseTime(requestParams, context, ee, next) {
  context.vars.requestStartTime = Date.now();
  return next();
}

// カスタムメトリクスの記録
function recordCustomMetrics(requestParams, response, context, ee, next) {
  if (context.vars.requestStartTime) {
    const responseTime = Date.now() - context.vars.requestStartTime;

    // カスタムメトリクスとしてレスポンス時間を記録
    ee.emit("customStat", {
      stat: "custom.response_time",
      value: responseTime,
    });

    // エラー率の記録
    if (response.statusCode >= 400) {
      ee.emit("customStat", {
        stat: "custom.error_rate",
        value: 1,
      });
    } else {
      ee.emit("customStat", {
        stat: "custom.success_rate",
        value: 1,
      });
    }
  }

  return next();
}

// エラーハンドリング
function handleRequestError(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.error(
      `Request failed with status ${response.statusCode}:`,
      response.body
    );

    // エラー詳細の記録
    ee.emit("customStat", {
      stat: `error.${response.statusCode}`,
      value: 1,
    });
  }

  // GraphQLエラーの検出
  if (response.body) {
    try {
      const parsedBody = JSON.parse(response.body);
      if (parsedBody.errors && parsedBody.errors.length > 0) {
        console.error("GraphQL errors:", parsedBody.errors);

        ee.emit("customStat", {
          stat: "error.graphql",
          value: 1,
        });
      }
    } catch (error) {
      // JSON解析エラーは無視（レスポンスがJSONでない場合）
    }
  }

  return next();
}

// ユーザーセッションのシミュレーション
function simulateUserSession(requestParams, context, ee, next) {
  // セッションの継続時間を設定（30秒〜5分）
  const sessionDuration = Math.random() * 270 + 30; // 30-300秒
  context.vars.sessionDuration = sessionDuration;

  // ユーザーの行動パターンを設定
  const behaviors = ["casual", "active", "power_user"];
  context.vars.userBehavior =
    behaviors[Math.floor(Math.random() * behaviors.length)];

  // 行動パターンに基づいてリクエスト間隔を調整
  switch (context.vars.userBehavior) {
    case "casual":
      context.vars.thinkTime = Math.random() * 5 + 3; // 3-8秒
      break;
    case "active":
      context.vars.thinkTime = Math.random() * 3 + 1; // 1-4秒
      break;
    case "power_user":
      context.vars.thinkTime = Math.random() * 1 + 0.5; // 0.5-1.5秒
      break;
  }

  return next();
}

module.exports = {
  getUserId,
  validateWebSocketMessage,
  measureResponseTime,
  recordCustomMetrics,
  handleRequestError,
  simulateUserSession,
};
