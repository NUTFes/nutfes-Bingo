import React from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import styles from "./ToggleButton.module.css";

interface ToggleButtonProps {
  children: [React.ReactNode, React.ReactNode];
  isActive: boolean;
  onClick: () => void;
}

const ToggleButton = ({ children, isActive, onClick }: ToggleButtonProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      className={styles.toggleContainer}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <LazyMotion features={domAnimation}>
        <m.div
          className={styles.motionDiv}
          initial={false}
          animate={{ x: isActive ? "100%" : "0%" }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            duration: shouldReduceMotion ? 0 : undefined,
          }}
        />
      </LazyMotion>
      <span className={`${styles.toggleText} ${!isActive ? styles.active : ""}`}>
        {children[0]}
      </span>
      <span className={`${styles.toggleText} ${isActive ? styles.active : ""}`}>{children[1]}</span>
    </button>
  );
};

export default ToggleButton;
