import React from "react";
import styles from "./Button.module.css";

type ButtonProps = {
  text: string;
  textColor: string;
  backgroundColor: string;
  onClick?: () => void;
};

const Button: React.FC<ButtonProps> = ({
  text,
  textColor,
  backgroundColor,
  onClick,
}) => {
  return (
    <button
      className={styles.button}
      style={{ backgroundColor: backgroundColor, color: textColor }}
      onClick={onClick}
    >
      {text}
    </button>
  );
};

export default Button;
