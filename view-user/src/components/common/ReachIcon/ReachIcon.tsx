import React, { useEffect, useState } from "react";
import styles from "./ReachIcon.module.css";
import classNames from "classnames";
import Image from "next/image";

interface ReachIconProps {
  onClick: () => void;
  isOpen: boolean;
  setIsReachModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReachIcon = (props: ReachIconProps) => {
  const [colorInversion, setColorInversion] = useState<boolean>(false);
  const handleClick = () => {
    setColorInversion(!colorInversion);
    props.setIsReachModalOpen(!props.isOpen);
  };

  return (
    <button
      className={classNames(styles.reachIcon, {
        [styles.color_inversion]: colorInversion,
      })}
      onClick={handleClick}
    >
      <div className={styles.icon}>
        <Image
          src={colorInversion ? "/reach-icon-inversion.svg" : "/reach-icon.svg"}
          alt="Reach Icon"
          layout="fill"
        />
      </div>
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
