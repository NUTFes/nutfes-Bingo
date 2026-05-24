import React, { ReactNode } from "react";
import styles from "./Button.module.css";
import { cn } from "@/utils/utils";

interface ButtonProps {
  children: ReactNode;
  inversion?: boolean;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = (props) => {
  return (
    <button
      type="button"
      className={cn(styles.button, {
        [styles.inversion]: props.inversion,
      })}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};

export default Button;
