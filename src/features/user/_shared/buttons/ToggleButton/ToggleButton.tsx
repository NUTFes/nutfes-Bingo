import React from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import styles from "./ToggleButton.module.css";

interface ToggleButtonProps {
  children: [React.ReactNode, React.ReactNode];
  isActive: boolean;
  onClick: () => void;
}

const ToggleButton = (props: ToggleButtonProps) => {
  return (
    <button
      type="button"
      className={styles.toggleContainer}
      onClick={props.onClick}
      aria-pressed={props.isActive}
    >
      <LazyMotion features={domAnimation}>
        <m.div
          className={styles.motionDiv}
          initial={{ left: "0%" }}
          animate={props.isActive ? { left: "46%" } : { left: "0%" }}
          transition={{
            type: "spring",
            stiffness: 700,
            damping: 30,
          }}
        />
      </LazyMotion>
      <span className={`${styles.toggleButton} ${!props.isActive ? styles.active : ""}`}>
        {props.children[0]}
      </span>
      <span className={`${styles.toggleButton} ${props.isActive ? styles.active : ""}`}>
        {props.children[1]}
      </span>
    </button>
  );
};

export default ToggleButton;
