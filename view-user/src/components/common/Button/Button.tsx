// import React from "react";
import React, { FC, ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  children: ReactNode;
  inversion: boolean;
  onClick?: () => void;
}

const Button: FC<ButtonProps> = ({ children, inversion, onClick }) => {
  return (
    <button
      className={
        inversion ? styles.selected_button : styles.not_selected_button
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
