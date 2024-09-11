import React from "react";
import { motion } from "framer-motion";
import styles from "./ToggleButton.module.css";

interface ToggleButtonProps {
  children: [React.ReactNode, React.ReactNode];
  isActive: boolean;
  onClick: () => void;
}

const ToggleButton = (props: ToggleButtonProps) => {
  return (
    <div className={styles.toggleContainer} onClick={props.onClick}>
      <motion.div
        className={styles.motionDiv}
        initial={{ left: "0%" }}
        animate={props.isActive ? { left: "50%" } : { left: "0%" }}
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
        }}
      />
      <button
        className={`${styles.toggleButton} ${!props.isActive && styles.active}`}
      >
        {props.children[0]}
      </button>
      <button
        className={`${styles.toggleButton} ${props.isActive && styles.active}`}
      >
        {props.children[1]}
      </button>
    </div>
  );
};

export default ToggleButton;
