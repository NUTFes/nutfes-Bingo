import React, { ReactNode, useEffect, useState } from "react";
import styles from "./IconFramework.module.css";
import classNames from "classnames";

interface IconFrameworkProps {
  icon: ReactNode;
  text: string;
  outline?: boolean;
  inversion?: boolean;
  onClick?: () => void;
}

const IconFramework = (props: IconFrameworkProps) => {
  const [colorInversion, setColorInversion] = useState<boolean>(
    props.inversion ?? false,
  );

  useEffect(() => {
    setColorInversion(props.inversion ?? false);
  }, [props.inversion]);

  const handleClick = () => {
    setColorInversion(!colorInversion);
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
    >
      <div className={styles.icon}>{props.icon}</div>
      <span className={styles.text}>{props.text}</span>
    </button>
  );
};

export default IconFramework;
