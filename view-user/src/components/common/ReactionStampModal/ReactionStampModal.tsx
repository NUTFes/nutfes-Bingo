import React from "react";
import Image from "next/image";
import styles from "./ReactionStampModal.module.css";

interface ImageProps {
  src: string;
  alt: string;
}
interface ReactionStampModalProps {
  position?: string;
  images: ImageProps[];
}

const ReactionStampModal: React.FC<ReactionStampModalProps> = (props) => {
  const bubbleLeftPosition: React.CSSProperties = {
    "--bubble-left-position": props.position,
  } as React.CSSProperties;
  return (
    <div className={styles.bubble} style={bubbleLeftPosition}>
      <div className={styles.grid}>
        {props.images.map((image, index) => (
          <button key={index} className={styles.iconButton}>
            <Image src={image.src} alt={image.alt} fill />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReactionStampModal;
