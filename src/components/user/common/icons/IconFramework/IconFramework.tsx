"use client";

import React, { ReactNode, useState } from "react";
import styles from "./IconFramework.module.css";
import classNames from "classnames";

interface IconFrameworkProps {
  icon: ReactNode;
  text: string;
  outline?: boolean;
  inversion?: boolean;
  id?: string;
  onClick?: () => void;
  size?: "normal" | "wide";
  className?: string;
}

const IconFramework = (props: IconFrameworkProps) => {
  const [internalInversion, setInternalInversion] = useState<boolean>(false);
  const isInverted = props.inversion !== undefined ? props.inversion : internalInversion;

  const handleClick = () => {
    if (props.inversion === undefined) {
      setInternalInversion(!internalInversion);
    }
    if (props.onClick) {
      props.onClick();
    }
  };

  return (
    <button
      className={classNames(
        styles.iconContainer,
        {
          [styles.outline]: props.outline,
          [styles.color_inversion]: isInverted,
          [styles.wide]: props.size === "wide",
        },
        props.className,
      )}
      onClick={handleClick}
      id={props.id}
    >
      <div className={styles.icon}>{props.icon}</div>
      <span className={styles.text}>{props.text}</span>
    </button>
  );
};

export default IconFramework;
