"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/utils";

import styles from "./IconFramework.module.css";

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

const IconFramework = ({
  icon,
  text,
  outline,
  inversion,
  id,
  onClick,
  size = "normal",
  className,
}: IconFrameworkProps) => {
  return (
    <button
      type="button"
      className={cn(
        styles.iconContainer,
        {
          [styles.outline]: outline,
          [styles.color_inversion]: inversion,
          [styles.wide]: size === "wide",
        },
        className,
      )}
      onClick={onClick}
      id={id}
    >
      <div className={styles.icon}>{icon}</div>
      <span className={styles.text}>{text}</span>
    </button>
  );
};

export default IconFramework;
