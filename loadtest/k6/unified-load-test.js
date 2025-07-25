import http from "k6/http";
import { check, sleep } from "k6";
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
const pageLoadTime = new Trend("page_load_time");

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
    page_load_time: ["avg<2000", "p(95)<3000"],
  },
};

// 環境設定の取得
const ENV = __ENV.ENVIRONMENT || "local";
const config = environments[ENV];

// HTTPヘッダーの設定
const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "x-hasura-admin-secret": config.adminSecret,
};

// GraphQLリクエストの実行
function executeGraphQLQuery(query, variables = {}, description = "") {
  const payload = JSON.stringify({
    query: query,
    variables: variables,
  });

  const startTime = Date.now();
  const response = http.post(config.apiEndpoint, payload, {
    headers: headers,
    timeout: "10s",
  });
  const endTime = Date.now();

  // メトリクス記録
  responseTime.add(endTime - startTime);
  apiCalls.add(1);

  // レスポンスチェック
  const success = check(response, {
    [`${description} - Status is 200`]: (r) => r.status === 200,
    [`${description} - Response has data`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined && !body.errors;
      } catch (e) {
        return false;
      }
    },
    [`${description} - Response time < 2s`]: (r) => r.timings.duration < 2000,
  });

  if (!success) {
    errorRate.add(1);
    querySuccess.add(0);
    console.error(`Query failed: ${description}`, response.body);
  } else {
    errorRate.add(0);
    querySuccess.add(1);
  }

  return response;
}

// Next.jsページの負荷テスト
function testPageLoad(url, description) {
  const startTime = Date.now();
  const response = http.get(url, {
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    timeout: "15s",
  });
  const endTime = Date.now();

  pageLoadTime.add(endTime - startTime);

  const success = check(response, {
    [`${description} - Page loads successfully`]: (r) => r.status === 200,
    [`${description} - Page contains expected content`]: (r) =>
      r.body.includes("__NEXT_DATA__") || r.body.includes("next"),
    [`${description} - Page load time < 3s`]: (r) => r.timings.duration < 3000,
  });

  if (!success) {
    console.error(`Page load failed: ${description}`, response.status);
  }

  return response;
}

// ユーザーシナリオ: 番号一覧ページの閲覧
function userScenarioNumbersPage() {
  // 1. 番号一覧ページへアクセス
  testPageLoad(config.userPageUrl, "Numbers Page Load");
  sleep(1);

  // 2. 番号データの取得
  executeGraphQLQuery(graphqlQueries.getBingoNumbers, {}, "Get Bingo Numbers");
  sleep(0.5);

  // 3. ページ内での操作をシミュレート（ソート切り替えなど）
  sleep(Math.random() * 2 + 1); // 1-3秒間の閲覧
}

// ユーザーシナリオ: 景品一覧ページの閲覧
function userScenarioPrizesPage() {
  // 1. 景品一覧ページへアクセス
  testPageLoad(`${config.userPageUrl}/prizes`, "Prizes Page Load");
  sleep(1);

  // 2. 景品データの取得
  executeGraphQLQuery(graphqlQueries.getPrizes, {}, "Get Prizes List");
  sleep(0.5);

  // 3. ページ内での操作をシミュレート
  sleep(Math.random() * 3 + 2); // 2-5秒間の閲覧（景品は詳しく見る）
}

// リアルタイム更新のシミュレート
function simulateRealtimeUpdates() {
  // 番号データの定期的な取得（リアルタイム更新の代替）
  executeGraphQLQuery(
    graphqlQueries.getBingoNumbers,
    {},
    "Realtime Numbers Update"
  );
  sleep(0.2);

  // 景品状態の定期的な取得
  executeGraphQLQuery(graphqlQueries.getPrizes, {}, "Realtime Prizes Update");
  sleep(0.3);
}

// メインテストシナリオ
export default function () {
  const userId = `user_${__VU}_${__ITER}`;
  const scenarios = [
    userScenarioNumbersPage,
    userScenarioPrizesPage,
    simulateRealtimeUpdates,
  ];

  // ランダムにシナリオを選択（実際のユーザー行動をシミュレート）
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  try {
    scenario();
  } catch (error) {
    console.error(`Scenario failed for ${userId}:`, error.message);
    errorRate.add(1);
  }

  // ユーザー間の操作間隔をシミュレート
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5秒の待機
}

// セットアップ関数
export function setup() {
  console.log(`🚀 負荷テスト開始 - 環境: ${ENV}`);
  console.log(`📍 ユーザーページ: ${config.userPageUrl}`);
  console.log(`📍 API エンドポイント: ${config.apiEndpoint}`);

  // 事前接続チェック
  const healthCheck = http.get(config.userPageUrl, { timeout: "10s" });
  if (healthCheck.status !== 200) {
    throw new Error(`Health check failed: ${healthCheck.status}`);
  }

  return { startTime: Date.now() };
}

// 終了処理
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`✅ 負荷テスト完了 - 実行時間: ${duration}秒`);
}
