import Image from "next/image";
import styles from "./styles.module.css";
import reachIcon from "/public/reach-icon.svg";

interface ReachCountProps {
  count: number;
}

function ReachCount({ count }: ReachCountProps) {
  return (
    <div className={styles.reachCountContainer}>
      <div className={styles.reachIcon}>
        <Image src={reachIcon} alt="Reach Icon" />
      </div>
      <div className={styles.reachText}>REACH</div>
      <div className={styles.count}>{count}</div>
    </div>
  );
}

export default ReachCount;
