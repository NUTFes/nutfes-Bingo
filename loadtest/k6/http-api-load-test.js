import http from "k6/http";
import { sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import {
  environments,
  performanceTargets,
  graphqlQueries,
} from "../config/environments.js";

// カスタムメトリクス
const responseTime = new Trend("http_response_time");
const errorRate = new Rate("http_error_rate");
const querySuccess = new Rate("graphql_query_success");
const apiCalls = new Counter("total_api_calls");

// 負荷テストの設定
export const options = {
  stages: (() => {
    const maxUsers = parseInt(__ENV.MAX_USERS || "500");
    const scaledSteps =
      performanceTargets.maxUsers.getScaledLoadSteps(maxUsers);

    return [
      { duration: "10s", target: scaledSteps.warmup.users },
      { duration: "10s", target: scaledSteps.normal.users },
      { duration: "10s", target: scaledSteps.peak.users },
      { duration: "10s", target: scaledSteps.stress.users },
      { duration: "10s", target: 0 },
    ];
  })(),
  thresholds: {
    http_response_time: [
      `avg<${performanceTargets.httpResponseTime.avg}`,
      `p(95)<${performanceTargets.httpResponseTime.p95}`,
      `p(99)<${performanceTargets.httpResponseTime.p99}`,
    ],
    http_error_rate: [`rate<${performanceTargets.errorRate.max / 100}`],
    graphql_query_success: [`rate>0.99`],
  },
};

// 環境設定の取得
const ENV = __ENV.ENVIRONMENT || "local";
const config = environments[ENV];

// HTTPヘッダーの設定
const headers = {
  "Content-Type": "application/json",
  "x-hasura-admin-secret": config.adminSecret,
};

// GraphQLリクエストの実行
function executeGraphQLQuery(query, variables = {}) {
  const payload = JSON.stringify({
    query: query,
    variables: variables,
  });

  const response = http.post(config.apiEndpoint, payload, { headers });
  apiCalls.add(1);

  const success = check(response, {
    "Status is 200": (r) => r.status === 200,
    "Response time < 2s": (r) => r.timings.duration < 2000,
    "Valid JSON response": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  if (response.status === 200) {
    try {
      const data = JSON.parse(response.body);
      const hasErrors = data.errors && data.errors.length > 0;

      if (!hasErrors) {
        querySuccess.add(1);
        errorRate.add(0);
      } else {
        querySuccess.add(0);
        errorRate.add(1);
        console.error("GraphQL errors:", data.errors);
      }
    } catch (e) {
      querySuccess.add(0);
      errorRate.add(1);
      console.error("Failed to parse response:", e);
    }
  } else {
    querySuccess.add(0);
    errorRate.add(1);
  }

  responseTime.add(response.timings.duration);
  return response;
}

export default function () {
  const userId = `user_${__VU}_${__ITER}`;

  // 1. ビンゴ番号の取得（メイン機能）
  executeGraphQLQuery(graphqlQueries.getBingoNumbers);
  sleep(0.5);

  // 2. 景品情報の取得
  executeGraphQLQuery(graphqlQueries.getPrizes);
  sleep(0.5);

  // 3. ユーザーのビンゴカード取得
  executeGraphQLQuery(graphqlQueries.getUserBingoCard, {
    userId: userId,
  });
  sleep(0.5);

  // 4. 再度ビンゴ番号を取得（リアルタイム更新のシミュレーション）
  if (Math.random() < 0.7) {
    // 70%の確率で再取得
    executeGraphQLQuery(graphqlQueries.getBingoNumbers);
    sleep(1);
  }

  // 5. 景品情報の再取得（更新チェック）
  if (Math.random() < 0.5) {
    // 50%の確率で再取得
    executeGraphQLQuery(graphqlQueries.getPrizes);
    sleep(1);
  }

  // リクエスト間隔の調整（ユーザーの自然な閲覧パターン）
  sleep(Math.random() * 3 + 2); // 2-5秒のランダム間隔
}
