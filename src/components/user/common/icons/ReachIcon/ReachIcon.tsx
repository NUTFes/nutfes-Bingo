"use client";

import React from "react";
import styles from "./ReachIcon.module.css";
import classNames from "classnames";
import Image from "next/image";

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
      className={classNames(styles.reachIcon, {
        [styles.color_inversion]: props.isOpen,
      })}
      onClick={handleClick}
      id={props.id}
    >
      <div className={styles.icon}>
        <Image
          src="/icon_reach.svg"
          alt="Reach"
          width={48}
          height={48}
          className={props.isOpen ? styles.inverted : ""}
        />
      </div>
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
