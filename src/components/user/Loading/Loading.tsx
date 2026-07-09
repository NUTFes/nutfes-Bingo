import styles from "./Loading.module.css";

const Loading = () => {
  return (
    <output className={styles.overlay} aria-live="polite" aria-atomic="true">
      <div className={styles.card}>
        <div className={styles.brand} aria-hidden="true">
          nutfes-Bingo
        </div>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.message}>読み込み中…</p>
      </div>
    </output>
  );
};

export default Loading;
