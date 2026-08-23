import styles from "./ScreenReachCount.module.css";

interface ScreenReachCountProps {
  count: number;
}

function ScreenReachCount({ count }: ScreenReachCountProps) {
  return (
    <div className={styles.reachCountContainer} aria-label={`リーチ ${count} 人`}>
      <div className={styles.reachIconWrapper}>
        <span className={styles.reachIcon} aria-hidden="true" />
      </div>
      <div className={styles.reachText}>REACH</div>
      <div className={styles.countContainer}>
        <div className={styles.count} key={count}>
          {count}
        </div>
      </div>
    </div>
  );
}

export default ScreenReachCount;
