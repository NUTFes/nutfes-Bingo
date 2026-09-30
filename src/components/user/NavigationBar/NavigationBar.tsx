import { clsx } from "clsx";
import type { ReactNode, Ref } from "react";
import styles from "./NavigationBar.module.css";

interface NavigationBarProps {
  children: ReactNode;
  isCentered: boolean;
  ref?: Ref<HTMLDivElement>;
}

const NavigationBar = ({ children, isCentered, ref }: NavigationBarProps) => {
  return (
    <div
      ref={ref}
      className={clsx(styles.navigationBar, {
        [styles.center]: isCentered,
      })}
    >
      {children}
    </div>
  );
};

export default NavigationBar;
