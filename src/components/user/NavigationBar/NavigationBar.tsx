import { cn } from "@/utils/utils";
import styles from "./NavigationBar.module.css";

interface NavigationBarProps {
  children: React.ReactNode;
  isCentered: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

const NavigationBar = ({ children, isCentered, ref }: NavigationBarProps) => {
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
};

export default NavigationBar;
