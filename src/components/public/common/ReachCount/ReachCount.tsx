import styles from "./styles.module.css";

interface ReachCountProps {
  count: number;
}

function ReachCount({ count }: ReachCountProps) {
  return (
    <div className={styles.reachCountContainer}>
      <span className={styles.reachIcon} aria-hidden="true" />
      <div className={styles.reachText}>REACH</div>
      <div className={styles.count}>{count}</div>
    </div>
  );
}

export default ReachCount;
