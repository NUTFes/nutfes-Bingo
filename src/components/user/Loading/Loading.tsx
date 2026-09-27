import { useEffect, useState } from "react";
import Button from "@/components/user/buttons/Button";
import modalStyles from "@/components/user/Modal/Modal.module.css";

import styles from "./Loading.module.css";

const Loading = () => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={`${modalStyles.content} ${styles.card}`}>
        <div className={styles.brand}>nutfes-Bingo</div>
        {timedOut ? (
          <>
            <p className={styles.error} role="alert">
              接続できません。通信環境を確認してください。
            </p>
            <Button className={styles.retryButton} onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          </>
        ) : (
          <>
            <div className={styles.spinner} aria-hidden="true" />
            <output className={styles.message} aria-live="polite">
              読み込み中…
            </output>
          </>
        )}
      </div>
    </div>
  );
};

export default Loading;
