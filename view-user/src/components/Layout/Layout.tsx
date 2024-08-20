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

  const Icons = (pageName: string) => {
    let icons = [];
    switch (pageName) {
      case "/":
        // todoprizes,reactions,reach,settings
        icons = [
          <PrizesIcon key="prize1" />,
          <PrizesIcon key="prize2" />,
          isReachIconVisible && (
            <ReachIcon key="reach" onClick={handleReachIconClick} />
          ),
          <PrizesIcon key="prize3" />,
        ];
        break;
      case "/prizes":
        // todo back,reactions, reach,settings
        icons = [
          <PrizesIcon key="prize1" />,
          isReachIconVisible && (
            <ReachIcon key="reach" onClick={handleReachIconClick} />
          ),
          <PrizesIcon key="prize2" />,
          <PrizesIcon key="prize3" />,
        ];
        break;
      default:
        icons = [
          <PrizesIcon key="prize1" />,
          isReachIconVisible && (
            <ReachIcon key="reach" onClick={handleReachIconClick} />
          ),
          <PrizesIcon key="prize2" />,
          <PrizesIcon key="prize3" />,
        ];
    }
    return icons.filter(Boolean);
  };

  const iconElements = Icons(props.pageName);

  return (
    <div>
      <Header />
      <main>{props.children}</main>
      {isModalOpen && (
        <ReactionStampModal position={testPosition} images={images} />
      )}
      <NavigationBar isCentered={iconElements.length <= 3}>
        {iconElements}
      </NavigationBar>
    </div>
  );
};

export default Layout;
