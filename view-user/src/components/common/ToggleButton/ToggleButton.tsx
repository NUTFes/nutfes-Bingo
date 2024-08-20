import React, { useState } from "react";
import { motion } from "framer-motion";
import styles from "./ToggleButton.module.css";

interface ToggleButtonProps {
  children: [React.ReactNode, React.ReactNode];
  onClick?: () => void;
}

const ToggleButton = (props: ToggleButtonProps) => {
  const [isActive, setIsActive] = useState(false);

  const toggleState = () => {
    setIsActive(!isActive);
    if (props.onClick) {
      props.onClick();
    }
  };

  return (
    <div className={styles.toggleContainer} onClick={toggleState}>
      <motion.div
        className={styles.motionDiv}
        initial={{ left: "0%" }}
        animate={isActive ? { left: "50%" } : { left: "0%" }}
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
        }}
      />
      <button
        className={`${styles.toggleButton} ${!isActive && styles.active}`}
      >
        {props.children[0]}
      </button>
      <button className={`${styles.toggleButton} ${isActive && styles.active}`}>
        {props.children[1]}
      </button>
    </div>
  );
};

export default ToggleButton;
