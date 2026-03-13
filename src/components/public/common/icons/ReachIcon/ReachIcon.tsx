"use client";

import Image from "next/image";
import classNames from "classnames";
import { useEffect, useState } from "react";

import styles from "./ReachIcon.module.css";

interface ReachIconProps {
  isOpen: boolean;
  id?: string;
  setIsReachModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReachIcon = ({ isOpen, id, setIsReachModalOpen }: ReachIconProps) => {
  const [colorInversion, setColorInversion] = useState(false);

  useEffect(() => {
    setColorInversion(isOpen);
  }, [isOpen]);

  return (
    <button
      type="button"
      className={classNames(styles.reachIcon, {
        [styles.color_inversion]: colorInversion,
      })}
      onClick={() => setIsReachModalOpen(!isOpen)}
      id={id}
    >
      <div className={styles.icon}>
        <Image
          src="/icon_reach.svg"
          alt="Reach"
          fill
          className={colorInversion ? styles.inverted : ""}
        />
      </div>
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
