import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import styles from "./Layout.module.css";
import {
  ReachIcon,
  PrizesIcon,
  BackIcon,
  ReactionsIcon,
  SettingsIcon,
  ReactionStampModal,
  NavigationBar,
  Header,
} from "@/components/common";

const images = [
  { src: "/ReactionIcon/crap.png", alt: "crap icon" },
  { src: "/ReactionIcon/good.png", alt: " good icon" },
  { src: "/ReactionIcon/cracker.png", alt: "cracker icon" },
  { src: "/ReactionIcon/heart.png", alt: "heart icon" },
  { src: "/ReactionIcon/smile.png", alt: "smile icon" },
  { src: "/ReactionIcon/angry.png", alt: "angry icon" },
  { src: "/ReactionIcon/skull.png", alt: "skull icon" },
  { src: "/ReactionIcon/sad.png", alt: "sad icon" },
];

interface LayoutProps {
  children: React.ReactNode;
  pageName: string;
}

const Layout = (props: LayoutProps) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isReachIconVisible, setReachIconVisible] = useState<boolean>(true);
  const [navBarHeight, setNavBarHeight] = useState<string>();
  const [headerHeight, setHeaderHeight] = useState<string>();
  const navRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const position: string = isReachIconVisible ? "29%" : "50%";

  // navBar,headerの高さをstring型で渡す
  useLayoutEffect(() => {
    if (navRef.current) {
      const navHeight = navRef.current.getBoundingClientRect().height;
      setNavBarHeight(navHeight.toString());
    }
    if (headerRef.current) {
      const headerHeight = headerRef.current.getBoundingClientRect().height;
      setHeaderHeight((headerHeight + headerHeight / 10).toString());
    }
  }, []);

  // localStorageから状態を読み込む
  useEffect(() => {
    const storedVisibility = localStorage.getItem("isReachIconVisible");
    if (storedVisibility !== null) {
      setReachIconVisible(storedVisibility === "true");
    }
  }, []);

  const handleReachIconClick = () => {
    setReachIconVisible(false);
    localStorage.setItem("isReachIconVisible", "false");
  };

  const Icons = (pageName: string) => {
    let icons = [];
    switch (pageName) {
      case "/":
        icons = [
          <PrizesIcon key="prize" />,
          <ReactionsIcon
            isOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            key="reaction"
          />,
          isReachIconVisible && (
            <ReachIcon key="reach" onClick={handleReachIconClick} />
          ),
          <SettingsIcon key="settings" />,
        ];
        break;
      case "/prizes":
        icons = [
          <BackIcon key="back" />,
          <ReactionsIcon
            isOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            key="reaction"
          />,
          isReachIconVisible && (
            <ReachIcon key="reach" onClick={handleReachIconClick} />
          ),
          <SettingsIcon key="settings" />,
        ];
        break;
      default:
        icons = [
          <PrizesIcon key="prize" />,
          <ReactionsIcon
            isOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            key="reaction"
          />,
          isReachIconVisible && (
            <ReachIcon key="reach" onClick={handleReachIconClick} />
          ),
          <SettingsIcon key="settings" />,
        ];
    }
    return icons.filter(Boolean);
  };

  const iconElements = Icons(props.pageName);

  return (
    <div>
      {isModalOpen && (
        <ReactionStampModal
          position={position}
          height={navBarHeight}
          images={images}
        />
      )}
      <Header ref={headerRef} />
      <main
        style={{ paddingTop: `${headerHeight}px` }}
        className={styles.content}
      >
        {props.children}
      </main>
      <NavigationBar ref={navRef} isCentered={iconElements.length <= 3}>
        {iconElements}
      </NavigationBar>
    </div>
  );
};

export default Layout;
