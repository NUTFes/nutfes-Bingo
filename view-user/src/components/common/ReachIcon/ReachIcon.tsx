import React, { useEffect, useState } from "react";
import styles from "./ReachIcon.module.css";
import classNames from "classnames";

interface ReachIconProps {
  onClick: () => void;
  isOpen: boolean;
  setIsReachModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReachIcon = (props: ReachIconProps) => {
  const [colorInversion, setColorInversion] = useState<boolean>(false);
  const [mainColor, setMainColor] = useState<string>("");
  const [subColor, setSubColor] = useState<string>("");

  const handleClick = () => {
    props.setIsReachModalOpen(!props.isOpen);
  };

  useEffect(() => {
    setColorInversion(props.isOpen);
  }, [props.isOpen]);

  useEffect(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    setMainColor(rootStyles.getPropertyValue("--main-color").trim());
    setSubColor(rootStyles.getPropertyValue("--sub-color").trim());
  }, []);

  return (
    <button
      className={classNames(styles.reachIcon, {
        [styles.color_inversion]: colorInversion,
      })}
      onClick={handleClick}
    >
      <div className={styles.icon}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="3000"
          height="3000"
          fill="none"
          viewBox="0 0 3000 3000"
        >
          <path
            fill={colorInversion ? mainColor : "#FFFFFF"}
            fill-rule="evenodd"
            d="M255 757c0-55.228 44.772-100 100-100h1800c55.23 0 100 44.772 100 100v1800c0 55.23-44.77 100-100 100H355c-55.228 0-100-44.77-100-100V757Zm1000 675c-124.26 0-225 100.74-225 225s100.74 225 225 225 225-100.74 225-225-100.74-225-225-225Zm0-550c-96.65 0-175 78.35-175 175s78.35 175 175 175 175-78.35 175-175-78.35-175-175-175Zm-225 175c0-124.264 100.74-225 225-225s225 100.736 225 225c0 124.26-100.74 225-225 225s-225-100.74-225-225Zm50 1200c0-96.65 78.35-175 175-175s175 78.35 175 175-78.35 175-175 175-175-78.35-175-175Zm175-225c-124.26 0-225 100.74-225 225s100.74 225 225 225 225-100.74 225-225-100.74-225-225-225Zm600-550c-96.65 0-175 78.35-175 175s78.35 175 175 175 175-78.35 175-175-78.35-175-175-175Zm-225 175c0-124.26 100.74-225 225-225s225 100.74 225 225-100.74 225-225 225-225-100.74-225-225Zm0-600c0-124.264 100.74-225 225-225s225 100.736 225 225c0 124.26-100.74 225-225 225s-225-100.74-225-225Zm50 1200c0-96.65 78.35-175 175-175s175 78.35 175 175-78.35 175-175 175-175-78.35-175-175Zm175-225c-124.26 0-225 100.74-225 225s100.74 225 225 225 225-100.74 225-225-100.74-225-225-225ZM655 1482c-96.65 0-175 78.35-175 175s78.35 175 175 175 175-78.35 175-175-78.35-175-175-175Zm-225 175c0-124.26 100.736-225 225-225s225 100.74 225 225-100.736 225-225 225-225-100.74-225-225Zm50-600c0-96.65 78.35-175 175-175s175 78.35 175 175-78.35 175-175 175-175-78.35-175-175Zm175-225c-124.264 0-225 100.736-225 225 0 124.26 100.736 225 225 225s225-100.74 225-225c0-124.264-100.736-225-225-225Zm0 1200c-124.264 0-225 100.74-225 225s100.736 225 225 225 225-100.74 225-225-100.736-225-225-225Z"
            clip-rule="evenodd"
          />
          <path
            fill={colorInversion ? mainColor : "#FFFFFF"}
            d="M2354.48 584.106c-25.23 8.394-48.1-17.749-36.43-41.637l145.24-297.218c9.42-19.265 35.42-22.72 49.54-6.581l168.65 192.785c14.12 16.139 7.23 41.449-13.11 48.219l-313.89 104.432Zm-252.18-85.614c-7.88 25.393-42.45 28.744-55.06 5.337l-156.9-291.233c-10.17-18.877 2.18-42.02 23.52-44.088l254.95-24.71c21.34-2.069 37.9 18.272 31.54 38.751l-98.05 315.943Zm296.07 332.312c-22.2-14.621-15.83-48.764 10.16-54.381l323.34-69.879c20.96-4.529 39.77 13.755 35.83 34.833l-47.04 251.785c-3.94 21.078-28.08 31.338-45.98 19.548l-276.31-181.906Z"
          />
        </svg>
      </div>
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
