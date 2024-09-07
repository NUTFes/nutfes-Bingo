import React from "react";
import styles from "./Dotbutton.module.css";

const DotButton: React.FC<{ selected: boolean; onClick: () => void }> = ({
  selected,
  onClick,
}) => {
  return (
    <button
      className={`${styles.dotButton} ${selected ? styles.selected : ""}`}
      onClick={onClick}
    />
  );
};

export default DotButton;
