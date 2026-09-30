import { useEffect, useState } from "react";

import styles from "./Loading.module.css";

const Loading = () => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={styles.loading}>
      {timedOut ? (
        <div className={styles.error}>
          <p role="alert">接続できません。通信環境を確認してください。</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      ) : (
        <output aria-live="polite">読み込み中…</output>
      )}
    </div>
  );
};

export default Loading;
