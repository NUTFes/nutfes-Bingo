"use client";

import React from "react";
import classNames from "classnames";
import styles from "./ReachIcon.module.css";

interface ReachIconProps {
  onClick: () => void;
  isOpen: boolean;
  id?: string;
  setIsReachModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReachIcon = (props: ReachIconProps) => {
  const handleClick = () => {
    props.setIsReachModalOpen(!props.isOpen);
  };

  return (
    <button
      type="button"
      className={classNames(styles.reachButton, {
        [styles.inverted]: props.isOpen,
      })}
      onClick={handleClick}
      id={props.id}
      aria-label="REACH"
    >
      <span className={styles.icon} aria-hidden="true" />
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
