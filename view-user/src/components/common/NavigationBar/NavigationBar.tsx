import React from "react";
import classNames from "classnames";
import styles from "./NavigationBar.module.css";

interface NavigationBarProps {
  children: React.ReactNode;
  isCentered: boolean;
}

const NavigationBar = ({ children, isCentered }: NavigationBarProps) => {
  return (
    <div className={classNames(styles.navigationBar, {
      [styles.center]: isCentered,
    })}>
      {children}
    </div>
  );
};

export default NavigationBar;
