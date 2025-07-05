/**
 * Artillery動的設定生成
 * 最大ユーザー数に基づいて負荷テストの設定を動的に生成
 */

const fs = require("fs");
const yaml = require("js-yaml");

function generateDynamicConfig(maxUsers = 500) {
  // 最大ユーザー数に基づいてスケールファクターを計算
  const scaleFactor = maxUsers / 500; // 基準値500を元にスケール

  const config = {
    config: {
      target:
        "{{ $processEnvironment.API_ENDPOINT || 'http://localhost:8080' }}",
      phases: [
        // ウォームアップフェーズ
        {
          duration: 10,
          arrivalRate: Math.ceil(2 * scaleFactor),
          name: "ウォームアップ",
        },
        // 通常負荷
        {
          duration: 10,
          arrivalRate: Math.ceil(10 * scaleFactor),
          rampTo: Math.ceil(25 * scaleFactor),
          name: "通常負荷",
        },
        // ピーク負荷
        {
          duration: 10,
          arrivalRate: Math.ceil(40 * scaleFactor),
          name: "ピーク負荷",
        },
        // ストレステスト
        {
          duration: 10,
          arrivalRate: Math.ceil(Math.min(80 * scaleFactor, maxUsers / 6)), // 10秒で到達可能な上限を考慮
          name: "ストレステスト",
        },
        // クールダウン
        {
          duration: 10,
          arrivalRate: Math.ceil(10 * scaleFactor),
          name: "クールダウン",
        },
      ],
      http: {
        timeout: 15,
        pool: Math.min(100, maxUsers),
      },
      ws: {
        timeout: 30,
      },
      environments: {
        local: {
          target: "http://localhost:8080",
          wsTarget: "ws://localhost:8080",
          userPageUrl: "http://localhost:3000",
        },
        production: {
          target: "https://bingo-api.nutfes.net",
          wsTarget: "wss://bingo-api.nutfes.net",
          userPageUrl: "https://bingo.nutfes.net",
        },
      },
      processor: "./artillery/optimized-processor.js",
      variables: {
        maxUsers: maxUsers,
      },
    },
    scenarios: [
      {
        name: "ユーザー閲覧シナリオ",
        weight: 70,
        flow: [
          {
            function: "generateUserId",
          },
          {
            function: "measurePageLoad",
          },
          {
            get: {
              url: "{{ userPageUrl }}",
              headers: {
                "User-Agent": "Artillery Load Test - User Viewing Scenario",
              },
            },
          },
          {
            function: "measurePageLoadComplete",
          },
          {
            think: "{{ $randomInt(1, 3) }}",
          },
          {
            function: "measureApiRequest",
          },
          {
            post: {
              url: "/v1/graphql",
              headers: {
                "Content-Type": "application/json",
                "x-hasura-admin-secret":
                  "{{ $processEnvironment.ADMIN_SECRET || '/4XQdRUHXGtW' }}",
              },
              json: {
                query:
                  "query GetListNumbers { numbers { id number createdAt updatedAt } }",
              },
            },
          },
          {
            function: "measureApiResponseComplete",
          },
          {
            think: "{{ $randomInt(2, 5) }}",
          },
          {
            function: "measureApiRequest",
          },
          {
            post: {
              url: "/v1/graphql",
              headers: {
                "Content-Type": "application/json",
                "x-hasura-admin-secret":
                  "{{ $processEnvironment.ADMIN_SECRET || '/4XQdRUHXGtW' }}",
              },
              json: {
                query:
                  "query GetListPrizes { prizes { id isWon nameJp nameEn createdAt updatedAt image { id bucketName fileName fileType createdAt updatedAt } } }",
              },
            },
          },
          {
            function: "measureApiResponseComplete",
          },
          {
            think: "{{ $randomInt(3, 8) }}",
          },
        ],
      },
      {
        name: "WebSocket購読シナリオ",
        weight: 30,
        engine: "ws",
        flow: [
          {
            function: "generateUserId",
          },
          {
            function: "measureWebSocketConnection",
          },
          {
            connect: {
              url: "{{ wsTarget }}/v1/graphql",
              subprotocols: ["graphql-ws"],
              headers: {
                "x-hasura-admin-secret":
                  "{{ $processEnvironment.ADMIN_SECRET || '/4XQdRUHXGtW' }}",
              },
            },
          },
          {
            function: "measureWebSocketConnectionComplete",
          },
          {
            send: {
              payload: JSON.stringify({
                type: "connection_init",
              }),
            },
          },
          {
            think: 1,
          },
          {
            send: {
              payload: JSON.stringify({
                id: "{{ uuid }}",
                type: "start",
                payload: {
                  query:
                    "subscription SubscribeListNumbers { numbers { id number createdAt updatedAt } }",
                },
              }),
            },
          },
          {
            think: "{{ $randomInt(10, 30) }}",
          },
          {
            send: {
              payload: JSON.stringify({
                id: "{{ uuid }}",
                type: "stop",
              }),
            },
          },
          {
            think: 1,
          },
        ],
      },
    ],
  };

  return config;
}

// コマンドライン引数から最大ユーザー数を取得
const maxUsers = parseInt(process.argv[2]) || 500;
const config = generateDynamicConfig(maxUsers);

// YAML形式で出力
console.log(
  yaml.dump(config, {
    flowLevel: -1,
    styles: {
      "!!str": "literal",
    },
  })
);
