import React from "react";
import Image from "next/image";
import styles from "./ReactionStampModal.module.css";

interface ImageProps {
  name: string;
  src: string;
  alt: string;
}
interface ReactionStampModalProps {
  position?: string;
  height?: string;
  images: ImageProps[];
  onClick: (name: string) => void;
}

const ReactionStampModal = (props: ReactionStampModalProps) => {
  const bubbleLeftPosition: React.CSSProperties = {
    "--bubble-left-position": props.position,
  } as React.CSSProperties;

  const modalBottom: React.CSSProperties = {
    bottom: props.height
      ? `calc(${props.height}px + (${props.height}px / 7))`
      : "0px",
  };

  const handleClick = (name: string) => {
    props.onClick(name);
  };

  return (
    <div className={styles.horizontalCenter}>
      <div
        className={styles.bubble}
        style={{ ...bubbleLeftPosition, ...modalBottom }}
      >
        <div className={styles.grid}>
          {props.images.map((image) => (
            <button
              key={image.name}
              className={styles.iconButton}
              onClick={() => handleClick(image.name)}
            >
              <Image src={image.src} alt={image.alt} fill />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReactionStampModal;
