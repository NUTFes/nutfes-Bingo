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
  disabled?: boolean;
  activeName?: string;
}

const ReactionStampModal = (props: ReactionStampModalProps) => {
  const bubbleLeftPosition: React.CSSProperties = {
    "--bubble-left-position": props.position,
  } as React.CSSProperties;

  const modalBottom: React.CSSProperties = {
    bottom: props.height ? `calc(${props.height}px + (${props.height}px / 7))` : "0px",
  };

  // 押下禁止中は無視、許可時のみ親の送信処理を実行
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
              // 直近に押されたスタンプかどうか（派手エフェクトの対象）
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
                      {/* リップル（波紋）を2連で表示 */}
                      <span className={styles.ripple} aria-hidden="true" />
                      <span className={`${styles.ripple} ${styles.delay}`} aria-hidden="true" />
                      {/* 押したスタンプ画像が放射状に飛ぶエフェクト */}
                      <span className={styles.particles} aria-hidden="true">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <span key={i} className={styles.particle}>
                            <span className={styles.particleImg}>
                              <Image src={image.src} alt="" fill sizes="40px" />
                            </span>
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                  <Image src={image.src} alt={image.alt} fill sizes="(max-width: 768px) 18vw, 88px" />
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
