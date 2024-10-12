import styles from "./Header.module.css";
import { useRouter } from "next/router";
import { IoHelpCircleOutline } from "react-icons/io5";
import { HelpCarousel } from "@/components";
import { useState, useEffect } from "react";

const Header = () => {
  const router = useRouter();
  const [isOpenHelpCarousel, setIsOpenHelpCarousel] = useState(false);
  const [mainColor, setMainColor] = useState("");
  const [subColor, setSubColor] = useState("");

  useEffect(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    setMainColor(rootStyles.getPropertyValue("--main-color").trim());
    setSubColor(rootStyles.getPropertyValue("--sub-color").trim());
    const isHelpShown = localStorage.getItem("isOpenHelpCarousel");

    if (isHelpShown === null) {
      setIsOpenHelpCarousel(true);
      localStorage.setItem("isOpenHelpCarousel", JSON.stringify(true));
    }
  }, []);

  const handleClick = () => {
    setIsOpenHelpCarousel(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.logo} onClick={() => router.push("/")}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="4569"
            height="1723"
            fill="none"
            viewBox="0 0 4569 1723"
          >
            <path
              fill={subColor}
              d="M193.24 1319V359h427.52c58.027 0 107.947 21.333 149.76 64 41.813 41.813 62.72 91.733 62.72 149.76v52.48c0 63.147-17.92 112.64-53.76 148.48-34.987 34.987-87.893 56.747-158.72 65.28 70.827 0 123.733 21.76 158.72 65.28 35.84 42.667 53.76 92.16 53.76 148.48v52.48c0 58.03-20.907 108.37-62.72 151.04-41.813 41.81-91.733 62.72-149.76 62.72H193.24ZM407 785.24h106.24c29.867 0 55.04-10.24 75.52-30.72 21.333-21.333 32-46.507 32-75.52V572.76c0-29.867-10.667-55.04-32-75.52-20.48-21.333-45.653-32-75.52-32H407v320Zm0 427.52h106.24c29.867 0 55.04-10.67 75.52-32 21.333-21.33 32-46.51 32-75.52V999c0-70.827-35.84-106.24-107.52-106.24H407v320Zm639.99-747.52V359h213.76v106.24h-213.76Zm0 853.76V572.76h213.76V1319h-213.76Zm426.25 0V572.76H1687V679c4.27-35.84 15.36-62.293 33.28-79.36 17.92-17.92 42.24-26.88 72.96-26.88h107.52c58.03 0 107.95 20.907 149.76 62.72 41.81 41.813 62.72 91.733 62.72 149.76V1319h-212.48V785.24c0-29.013-10.67-53.76-32-74.24-20.48-21.333-45.65-32-75.52-32-29.01 0-54.19 10.667-75.52 32-20.48 20.48-30.72 45.227-30.72 74.24V1319h-213.76Zm1493.75-746.24v852.48c0 58.03-20.91 107.95-62.72 149.76-41.81 42.67-91.73 64-149.76 64h-213.76c-125.44 0-196.69-71.25-213.76-213.76h107.52c5.12 71.68 40.53 107.52 106.24 107.52h106.24c29.87 0 55.04-10.67 75.52-32 21.33-20.48 32-45.65 32-75.52v-212.48c-8.53 70.83-44.37 106.24-107.52 106.24h-106.24c-58.03 0-108.37-20.91-151.04-62.72-41.81-41.81-62.72-92.16-62.72-151.04v-320c0-58.027 20.91-107.947 62.72-149.76 42.67-41.813 93.01-62.72 151.04-62.72h426.24ZM2754.51 679h-107.52c-29.01 0-54.19 10.667-75.52 32-20.48 20.48-30.72 45.227-30.72 74.24v320c0 29.01 10.24 54.19 30.72 75.52 21.33 21.33 46.51 32 75.52 32 29.87 0 55.04-10.67 75.52-32 21.33-21.33 32-46.51 32-75.52V679Zm639.99-106.24h213.76c58.03 0 107.95 20.907 149.76 62.72 41.81 41.813 62.72 91.733 62.72 149.76v320c0 58.03-20.91 108.37-62.72 151.04-41.81 41.81-91.73 62.72-149.76 62.72H3394.5c-58.03 0-108.37-20.91-151.04-62.72-41.81-41.81-62.72-92.16-62.72-151.04v-320c0-58.027 20.91-107.947 62.72-149.76 42.67-41.813 93.01-62.72 151.04-62.72Zm0 212.48v320c0 29.01 10.24 54.19 30.72 75.52 21.33 21.33 46.51 32 75.52 32 29.87 0 55.04-10.67 75.52-32 21.33-21.33 32-46.51 32-75.52v-320c0-29.013-10.67-53.76-32-74.24-20.48-21.333-45.65-32-75.52-32-29.01 0-54.19 10.667-75.52 32-20.48 20.48-30.72 45.227-30.72 74.24ZM4142.01 999V359h212.48v640h-212.48Zm0 320v-213.76h212.48V1319h-212.48Z"
            />
            <path
              fill={mainColor}
              d="M106.24 1228V268h427.52c58.027 0 107.947 21.333 149.76 64 41.813 41.813 62.72 91.733 62.72 149.76v52.48c0 63.147-17.92 112.64-53.76 148.48-34.987 34.987-87.893 56.747-158.72 65.28 70.827 0 123.733 21.76 158.72 65.28 35.84 42.667 53.76 92.16 53.76 148.48v52.48c0 58.03-20.907 108.37-62.72 151.04-41.813 41.81-91.733 62.72-149.76 62.72H106.24ZM320 694.24h106.24c29.867 0 55.04-10.24 75.52-30.72 21.333-21.333 32-46.507 32-75.52V481.76c0-29.867-10.667-55.04-32-75.52-20.48-21.333-45.653-32-75.52-32H320v320Zm0 427.52h106.24c29.867 0 55.04-10.67 75.52-32 21.333-21.33 32-46.51 32-75.52V908c0-70.827-35.84-106.24-107.52-106.24H320v320Zm639.99-747.52V268h213.76v106.24H959.99Zm0 853.76V481.76h213.76V1228H959.99Zm426.25 0V481.76H1600V588c4.27-35.84 15.36-62.293 33.28-79.36 17.92-17.92 42.24-26.88 72.96-26.88h107.52c58.03 0 107.95 20.907 149.76 62.72 41.81 41.813 62.72 91.733 62.72 149.76V1228h-212.48V694.24c0-29.013-10.67-53.76-32-74.24-20.48-21.333-45.65-32-75.52-32-29.01 0-54.19 10.667-75.52 32-20.48 20.48-30.72 45.227-30.72 74.24V1228h-213.76Zm1493.75-746.24v852.48c0 58.03-20.91 107.95-62.72 149.76-41.81 42.67-91.73 64-149.76 64h-213.76c-125.44 0-196.69-71.25-213.76-213.76h107.52c5.12 71.68 40.53 107.52 106.24 107.52h106.24c29.87 0 55.04-10.67 75.52-32 21.33-20.48 32-45.65 32-75.52v-212.48c-8.53 70.83-44.37 106.24-107.52 106.24h-106.24c-58.03 0-108.37-20.91-151.04-62.72-41.81-41.81-62.72-92.16-62.72-151.04v-320c0-58.027 20.91-107.947 62.72-149.76 42.67-41.813 93.01-62.72 151.04-62.72h426.24ZM2667.51 588h-107.52c-29.01 0-54.19 10.667-75.52 32-20.48 20.48-30.72 45.227-30.72 74.24v320c0 29.01 10.24 54.19 30.72 75.52 21.33 21.33 46.51 32 75.52 32 29.87 0 55.04-10.67 75.52-32 21.33-21.33 32-46.51 32-75.52V588Zm639.99-106.24h213.76c58.03 0 107.95 20.907 149.76 62.72 41.81 41.813 62.72 91.733 62.72 149.76v320c0 58.03-20.91 108.37-62.72 151.04-41.81 41.81-91.73 62.72-149.76 62.72H3307.5c-58.03 0-108.37-20.91-151.04-62.72-41.81-41.81-62.72-92.16-62.72-151.04v-320c0-58.027 20.91-107.947 62.72-149.76 42.67-41.813 93.01-62.72 151.04-62.72Zm0 212.48v320c0 29.01 10.24 54.19 30.72 75.52 21.33 21.33 46.51 32 75.52 32 29.87 0 55.04-10.67 75.52-32 21.33-21.33 32-46.51 32-75.52v-320c0-29.013-10.67-53.76-32-74.24-20.48-21.333-45.65-32-75.52-32-29.01 0-54.19 10.667-75.52 32-20.48 20.48-30.72 45.227-30.72 74.24ZM4055.01 908V268h212.48v640h-212.48Zm0 320v-213.76h212.48V1228h-212.48Z"
            />
          </svg>
        </div>
        <button className={styles.icon} onClick={handleClick}>
          <IoHelpCircleOutline />
        </button>
      </div>
      {isOpenHelpCarousel && (
        <HelpCarousel
          isOpened={isOpenHelpCarousel}
          setIsOpened={setIsOpenHelpCarousel}
        />
      )}
    </div>
  );
};

export default Header;
