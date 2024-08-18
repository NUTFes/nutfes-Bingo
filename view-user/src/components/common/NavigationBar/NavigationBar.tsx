import React from "react";
import styles from "./NavigationBar.module.css";

interface NavigationBarProps {
  children: React.ReactNode;
}
const NavigationBar = (props: NavigationBarProps) => {
  return <div className={styles.navigationBar}>{props.children}</div>;
};

export default NavigationBar;
