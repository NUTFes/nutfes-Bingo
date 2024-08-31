import React from "react";
import Image from "next/image";
import styles from "./ReactionStampModal.module.css";

interface ImageProps {
  id: number;
  src: string;
  alt: string;
}
interface ReactionStampModalProps {
  position?: string;
  height?: string;
  images: ImageProps[];
  onClick: (id: number) => void;
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

  const handleClick = (id: number) => {
    props.onClick(id);
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
              key={image.id}
              className={styles.iconButton}
              onClick={() => handleClick(image.id)}
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
