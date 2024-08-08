import React from "react";
import Image from "next/image";
import styles from "./ReactionStampModal.module.css";

const images = [
  { src: "/ReactionIcon/crap.png", alt: "crap icon" },
  { src: "/ReactionIcon/good.png", alt: " good icon" },
  { src: "/ReactionIcon/cracker.png", alt: "cracker icon" },
  { src: "/ReactionIcon/heart.png", alt: "heart icon" },
  { src: "/ReactionIcon/smile.png", alt: "smile icon" },
  { src: "/ReactionIcon/angry.png", alt: "angry icon" },
  { src: "/ReactionIcon/skull.png", alt: "skull icon" },
  { src: "/ReactionIcon/surprise.png", alt: "surprise icon" },
];

interface ReactionStampModalProps {
  position?: string;
}

const ReactionStampModal: React.FC<ReactionStampModalProps> = (props) => {
  const position = props.position || "left";

  return (
    <div className={`${styles.bubble} ${styles[position]}`}>
      <div className={styles.grid}>
        {images.map((image, index) => (
          <button key={index} className={styles.iconButton}>
            <Image src={image.src} alt={image.alt} fill />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReactionStampModal;
