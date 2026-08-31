import React from "react";
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
  disabled?: boolean;
  activeName?: string;
}

const ReactionStampModal = (props: ReactionStampModalProps) => {
  const bubbleLeftPosition: React.CSSProperties = {
    "--bubble-left-position": props.position,
  } as React.CSSProperties;

  const modalBottom: React.CSSProperties = {
    bottom: props.height
      ? `calc(${props.height}px + clamp(48px, 10vw, 64px))`
      : "clamp(64px, 16vw, 96px)",
  };

  const handleClick = (name: string) => {
    if (props.disabled) return;
    props.onClick(name);
  };

  return (
    <div className={styles.horizontalCenter}>
      <div className={styles.bubble} style={{ ...bubbleLeftPosition, ...modalBottom }}>
        <div className={styles.effectFrame}>
          <div className={styles.grid}>
            {props.images.map((image) => {
              const isActive = props.activeName === image.name;
              return (
                <button
                  key={image.name}
                  className={`${styles.iconButton} ${isActive ? styles.active : ""} ${
                    props.disabled ? styles.disabled : ""
                  }`}
                  onClick={() => handleClick(image.name)}
                  disabled={props.disabled}
                  aria-disabled={props.disabled}
                  type="button"
                >
                  {isActive && (
                    <>
                      <span className={styles.ripple} aria-hidden="true" />
                      <span className={`${styles.ripple} ${styles.delay}`} aria-hidden="true" />
                      <span className={styles.particles} aria-hidden="true">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <span key={i} className={styles.particle}>
                            <span className={styles.particleImg}>
                              <img className={styles.image} src={image.src} alt="" />
                            </span>
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                  <img className={styles.image} src={image.src} alt={image.alt} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactionStampModal;
