// import React from "react";
import React, { FC, ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  children: ReactNode;
  inversion: boolean;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = (props) => {
  return (
    <button
      className={
        props.inversion ? styles.selected_button : styles.not_selected_button
      }
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};

export default Button;
