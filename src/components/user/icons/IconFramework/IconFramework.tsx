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
  href?: string;
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
  href,
  size = "normal",
  className,
}: IconFrameworkProps) => {
  const content = (
    <>
      <div className={styles.icon}>{icon}</div>
      <span className={styles.text}>{text}</span>
    </>
  );
  const resolvedClassName = cn(
    styles.iconContainer,
    {
      [styles.outline]: outline,
      [styles.color_inversion]: inversion,
      [styles.wide]: size === "wide",
    },
    className,
  );

  if (href) {
    return (
      <a className={resolvedClassName} href={href} id={id}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={resolvedClassName} onClick={onClick} id={id}>
      {content}
    </button>
  );
};

export default IconFramework;
