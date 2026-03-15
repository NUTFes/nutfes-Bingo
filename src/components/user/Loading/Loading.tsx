import styles from "./Loading.module.css";

const Loading = () => {
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.card}>
        <div className={styles.brand}>nutfes-Bingo</div>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.message}>読み込み中...</p>
      </div>
    </div>
  );
};

export default Loading;
