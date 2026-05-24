import styles from "./Loading.module.css";

const Loading = () => {
  return (
    <div className={styles.overlay} role="status" aria-live="polite" aria-atomic="true">
      <div className={styles.card}>
        <div className={styles.brand} aria-hidden="true">
          nutfes-Bingo
        </div>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.message}>読み込み中…</p>
      </div>
    </div>
  );
};

export default Loading;
