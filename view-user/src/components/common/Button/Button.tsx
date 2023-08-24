import styles from "./Button.module.css";
import classNames from "classnames";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size: string;
  shape: string;
  onClick?: () => void;
}
const Button = (props: ButtonProps) => {
  return (
    <main>
      <div>
        <button
          className={classNames(
            styles.primary,
            styles[props.size],
            styles[props.shape],
            )}
            onClick={props.onClick}
        >
          {props.children}
        </button>
      </div>
    </main>
  );
};

export default Button;
