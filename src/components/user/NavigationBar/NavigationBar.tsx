import { forwardRef } from "react";
import { cn } from "@/utils/utils";
import styles from "./NavigationBar.module.css";

interface NavigationBarProps {
  children: React.ReactNode;
  isCentered: boolean;
}

const NavigationBar = forwardRef<HTMLDivElement, NavigationBarProps>(
  ({ children, isCentered }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(styles.navigationBar, {
          [styles.center]: isCentered,
        })}
      >
        {children}
      </div>
    );
  },
);
NavigationBar.displayName = "NavigationBar";

export default NavigationBar;
