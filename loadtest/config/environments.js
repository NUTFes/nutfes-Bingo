// 負荷試験環境設定 - ユーザー閲覧機能に特化
export const environments = {
  local: {
    userPageUrl: "http://localhost:3000",
    apiEndpoint: "http://localhost:8080/v1/graphql",
    wsEndpoint: "ws://localhost:8080/v1/graphql",
    adminSecret: "/4XQdRUHXGtW",
  },
  production: {
    userPageUrl: "https://bingo.nutfes.net/",
    apiEndpoint: "https://bingo-api.nutfes.net/v1/graphql",
    wsEndpoint: "wss://bingo-api.nutfes.net/v1/graphql",
    adminSecret: "/4XQdRUHXGtW",
  },
};

// 負荷試験のパフォーマンス目標値
export const performanceTargets = {
  // HTTP API のレスポンス時間目標 (ms)
  httpResponseTime: {
    avg: 500,
    p95: 1000,
    p99: 2000,
  },

  // WebSocket接続の目標値
  websocket: {
    connectionTime: 1000,
    messageLatency: 100,
  },

  // エラー率の目標値 (%)
  errorRate: {
    max: 1.0,
  },

  // 同時接続数の段階的負荷
  loadSteps: {
    warmup: { users: 10, duration: "10s" },
    normal: { users: 50, duration: "10s" },
    peak: { users: 200, duration: "10s" },
    stress: { users: 500, duration: "10s" },
  },

  // 最大ユーザー数の設定（環境変数 MAX_USERS で上書き可能）
  maxUsers: {
    default: 500,
    getMaxUsers: () => {
      const envMaxUsers = parseInt(process.env.MAX_USERS || "0");
      return envMaxUsers > 0 ? envMaxUsers : 500;
    },

    // 最大ユーザー数に応じて負荷ステップを動的に調整
    getScaledLoadSteps: (maxUsers = null) => {
      const targetMaxUsers =
        maxUsers || performanceTargets.maxUsers.getMaxUsers();
      const scaleFactor = targetMaxUsers / 500; // 基準値500を元にスケール

      return {
        warmup: { users: Math.ceil(10 * scaleFactor), duration: "10s" },
        normal: { users: Math.ceil(50 * scaleFactor), duration: "10s" },
        peak: { users: Math.ceil(200 * scaleFactor), duration: "10s" },
        stress: { users: targetMaxUsers, duration: "10s" },
      };
    },
  },
};

// GraphQL クエリ - ユーザー閲覧用のみ（実際のスキーマに基づく）
export const graphqlQueries = {
  // ビンゴ番号の取得（読み取り専用）
  getBingoNumbers: `
    query GetListNumbers {
      numbers {
        id
        number
        createdAt
        updatedAt
      }
    }
  `,

  // 景品情報の取得（読み取り専用）
  getPrizes: `
    query GetListPrizes {
      prizes {
        id
        isWon
        nameJp
        nameEn
        createdAt
        updatedAt
        image {
          id
          bucketName
          fileName
          fileType
          createdAt
          updatedAt
        }
      }
    }
  `,

  // リアルタイムビンゴ番号サブスクリプション
  subscribeBingoNumbers: `
    subscription SubscribeListNumbers {
      numbers {
        id
        number
        createdAt
        updatedAt
      }
    }
  `,

  // リアルタイム景品状態サブスクリプション
  subscribePrizesIsWon: `
    subscription SubscribeListPrizesIsWon {
      prizes {
        id
        isWon
        createdAt
        updatedAt
      }
    }
  `,
};
