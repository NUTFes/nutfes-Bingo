"use client";

import type { ReactNode } from "react";
import classNames from "classnames";

import styles from "./IconFramework.module.css";

interface IconFrameworkProps {
  icon: ReactNode;
  text: string;
  outline?: boolean;
  inversion?: boolean;
  id?: string;
  onClick?: () => void;
}

const IconFramework = ({ icon, text, outline, inversion, id, onClick }: IconFrameworkProps) => {
  return (
    <button
      type="button"
      className={classNames(styles.iconContainer, {
        [styles.outline]: outline,
        [styles.color_inversion]: inversion,
      })}
      onClick={onClick}
      id={id}
    >
      <div className={styles.icon}>{icon}</div>
      <span className={styles.text}>{text}</span>
    </button>
  );
};

export default IconFramework;
