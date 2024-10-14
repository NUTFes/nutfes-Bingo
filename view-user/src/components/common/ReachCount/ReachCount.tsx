import Image from "next/image";
import styles from "./styles.module.css";

interface ReachCountProps {
  count: number;
}

function ReachCount({ count }: ReachCountProps) {
  return (
    <div className={styles.reachCountContainer}>
      <div className={styles.reachIcon}>
        <Image src={"/reach-icon.svg"} alt="Reach Icon" fill />
      </div>
      <div className={styles.reachText}>REACH</div>
      <div className={styles.count}>{count}</div>
    </div>
  );
}

export default ReachCount;
