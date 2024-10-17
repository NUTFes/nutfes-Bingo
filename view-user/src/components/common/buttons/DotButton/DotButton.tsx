import styles from "./DotButton.module.css";

interface DotButtonProps {
  selected: boolean;
  onClick: () => void;
}

const DotButton = ({ selected, onClick }: DotButtonProps) => {
  return (
    <button
      className={`${styles.dotButton} ${selected ? styles.selected : ""}`}
      onClick={onClick}
    />
  );
};

export default DotButton;
