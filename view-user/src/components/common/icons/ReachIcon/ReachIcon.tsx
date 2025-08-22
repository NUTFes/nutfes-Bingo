import React, { useEffect, useState } from "react";
import styles from "./ReachIcon.module.css";
import classNames from "classnames";
import Icon from "public/icon_reach.svg";

interface ReachIconProps {
  onClick: () => void;
  isOpen: boolean;
  setIsReachModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReachIcon = (props: ReachIconProps) => {
  const [colorInversion, setColorInversion] = useState<boolean>(false);
  const [mainColor, setMainColor] = useState<string>("");
  const [subColor, setSubColor] = useState<string>("");

  const handleClick = () => {
    props.setIsReachModalOpen(!props.isOpen);
  };

  useEffect(() => {
    setColorInversion(props.isOpen);
  }, [props.isOpen]);

  useEffect(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    setMainColor(rootStyles.getPropertyValue("--main-color").trim());
    setSubColor(rootStyles.getPropertyValue("--sub-color").trim());
  }, []);

  return (
    <button
      className={classNames(styles.reachIcon, {
        [styles.color_inversion]: colorInversion,
      })}
      onClick={handleClick}
    >
      <div className={styles.icon}>
        <Icon className={colorInversion ? styles.inverted : ""} />
      </div>
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
