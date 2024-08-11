import React, { ReactNode, use, useState } from "react";
import styles from "./IconFramework.module.css";
import classNames from "classnames";

interface IconFrameworkProps {
  icon: ReactNode;
  text: string;
  outline?: boolean;
  onClick?: () => void;
}

const IconFramework = (props: IconFrameworkProps) => {
  const [clicked, setClicked] = useState<boolean>(false);
  const [colorInversion, setColorInversion] = useState<boolean>(false);

  const handleClick = () => {
    setColorInversion(!colorInversion);
    setClicked(true);
    if (props.onClick) {
      props.onClick();
    }
  };

  return (
    <button
      className={classNames(styles.iconContainer, {
        [styles.outline]: props.outline,
        [styles.color_inversion]: colorInversion,
      })}
      onClick={handleClick}
      disabled={clicked}
    >
      <div className={styles.icon}>{props.icon}</div>
      <span className={styles.text}>{props.text}</span>
    </button>
  );
};

export default IconFramework;
