import React, { ReactNode } from "react";
import styles from "./Button.module.css";
import classNames from "classnames";

interface ButtonProps {
  children: ReactNode;
  inversion?: boolean;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = (props) => {
  return (
    <button
      // className={classNames(styles.selected_button, {
      //   [styles.not_selected_button]: props.inversion,
      // })}
      className={classNames(styles.not_selected_button, {
        [styles.selected_button]: props.inversion,
      })}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};

export default Button;
