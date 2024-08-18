import React, { useState, useEffect } from "react";
import {
  ReachIcon,
  NavigationBar,
  PrizesIcon,
  ReactionStampModal,
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

const testPosition: string = "50%";

interface LayoutProps {
  children: React.ReactNode;
  pageName: string;
}

const Layout = (props: LayoutProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isReachIconVisible, setReachIconVisible] = useState(true);

  // 初回レンダリング時に localStorage から状態を読み込む
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

  const Icons = (pageName: any) => {
    switch (pageName) {
      case "/":
        return (
          <>
            {/* todo Prizes,reactions, reach,settings */}
            <PrizesIcon />
            <PrizesIcon />
            {isReachIconVisible && <ReachIcon onClick={handleReachIconClick} />}
            <PrizesIcon />
          </>
        );
      case "/prizes":
        return (
          <>
            {/* todo back,reactions, reach,settings */}
            <PrizesIcon />
            {isReachIconVisible && <ReachIcon onClick={handleReachIconClick} />}
            <PrizesIcon />
            <PrizesIcon />
          </>
        );
      default:
        return (
          <>
            <PrizesIcon />
            {isReachIconVisible && <ReachIcon onClick={handleReachIconClick} />}
            <PrizesIcon />
            <PrizesIcon />
          </>
        );
    }
  };

  return (
    <div>
      <Header />
      <main>{props.children}</main>
      {isModalOpen && (
        <ReactionStampModal position={testPosition} images={images} />
      )}
      <NavigationBar>{Icons(props.pageName)}</NavigationBar>
    </div>
  );
};

export default Layout;
