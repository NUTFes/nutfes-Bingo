import { useEffect, useState } from "react";

import styles from "./Loading.module.css";

const Loading = () => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <output className={styles.overlay} aria-live="polite" aria-atomic="true">
      <div className={styles.card}>
        <div className={styles.brand} aria-hidden="true">
          nutfes-Bingo
        </div>
        {timedOut ? (
          <>
            <p className={styles.message} role="alert">
              接続できません。通信環境を確認してください。
            </p>
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              再読み込み
            </button>
          </>
        ) : (
          <>
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.message}>読み込み中…</p>
          </>
        )}
      </div>
    </output>
  );
};

export default Loading;
