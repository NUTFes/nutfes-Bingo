"use client";

import { cn } from "@/utils/utils";

import styles from "./ReachIcon.module.css";

interface ReachIconProps {
  isOpen: boolean;
  id?: string;
  setIsReachModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReachIcon = ({ isOpen, id, setIsReachModalOpen }: ReachIconProps) => {
  return (
    <button
      type="button"
      className={cn(styles.reachButton, {
        [styles.inverted]: isOpen,
      })}
      onClick={() => setIsReachModalOpen(!isOpen)}
      id={id}
      aria-label="REACH"
    >
      <span className={styles.icon} aria-hidden="true" />
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
