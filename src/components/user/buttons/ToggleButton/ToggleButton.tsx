import styles from "./ToggleButton.module.css";

interface ToggleButtonProps {
  children: [React.ReactNode, React.ReactNode];
  isActive: boolean;
  onClick: () => void;
}

const ToggleButton = ({ children, isActive, onClick }: ToggleButtonProps) => (
  <button
    type="button"
    className={styles.toggleContainer}
    onClick={onClick}
    aria-pressed={isActive}
  >
    <div
      className={`${styles.motionDiv} ${isActive ? styles.motionDivActive : ""}`}
      aria-hidden="true"
    />
    <span className={`${styles.toggleText} ${!isActive ? styles.active : ""}`}>{children[0]}</span>
    <span className={`${styles.toggleText} ${isActive ? styles.active : ""}`}>{children[1]}</span>
  </button>
);

export default ToggleButton;
