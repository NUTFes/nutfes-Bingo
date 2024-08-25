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
  Modal,
  Button,
} from "@/components/common";
import { UpdateOneTriggerFlagDocument } from "@/type/graphql";
import type {
  UpdateOneTriggerFlagMutation,
  UpdateOneTriggerFlagMutationVariables,
} from "@/type/graphql";
import { useMutation } from "@apollo/client";

const images = [
  { id: 1, src: "/ReactionIcon/crap.png", alt: "crap icon" },
  { id: 2, src: "/ReactionIcon/good.png", alt: " good icon" },
  { id: 3, src: "/ReactionIcon/cracker.png", alt: "cracker icon" },
  { id: 4, src: "/ReactionIcon/heart.png", alt: "heart icon" },
  { id: 5, src: "/ReactionIcon/smile.png", alt: "smile icon" },
  { id: 6, src: "/ReactionIcon/angry.png", alt: "angry icon" },
  { id: 7, src: "/ReactionIcon/skull.png", alt: "skull icon" },
  { id: 8, src: "/ReactionIcon/sad.png", alt: "sad icon" },
];

interface LayoutProps {
  children: React.ReactNode;
  pageName: string;
}

const Layout = (props: LayoutProps) => {
  const [isReactionModalOpen, setIsReactionModalOpen] =
    useState<boolean>(false);
  const [isReachModalOpen, setIsReacgModalOpen] = useState<boolean>(false);
  const [isReachIconVisible, setReachIconVisible] = useState<boolean>(true);
  const [isFlag, setIsFlag] = useState<boolean>(false);
  const [navBarHeight, setNavBarHeight] = useState<string>();
  const navRef = useRef<HTMLDivElement>(null);
  const position: string = isReachIconVisible ? "29%" : "50%";
  const [updateFlag] = useMutation<
    UpdateOneTriggerFlagMutation,
    UpdateOneTriggerFlagMutationVariables
  >(UpdateOneTriggerFlagDocument);

  // navBarの高さをstring型で渡す
  useLayoutEffect(() => {
    if (navRef.current) {
      const navHeight = navRef.current.getBoundingClientRect().height;
      setNavBarHeight(navHeight.toString());
    }
  }, []);

  // localStorageから状態を読み込む
  useEffect(() => {
    const storedVisibility = localStorage.getItem("isReachIconVisible");
    if (storedVisibility !== null) {
      setReachIconVisible(storedVisibility === "true");
    }
  }, []);

  const handleReactionsiconClick = (id: number) => {
    setIsFlag(true);

    updateFlag({ variables: { id, trigger: true } });

    // 0.5病後に戻す。これ以上はきついかも
    setTimeout(() => {
      setIsFlag(false);
      updateFlag({ variables: { id, trigger: false } });
    }, 500);
  };

  const handleReachIconClick = () => {
    // todo リーチカウントAPIと繋ぎ込み

    setReachIconVisible(false);
    localStorage.setItem("isReachIconVisible", "false");
    setIsReacgModalOpen(!isReachModalOpen);
  };

  const Icons = (pageName: string) => {
    let icons = [];
    switch (pageName) {
      case "/":
        icons = [
          <PrizesIcon key="prize" />,
          <ReactionsIcon
            isOpen={isReactionModalOpen}
            setIsReactionModalOpen={setIsReactionModalOpen}
            key="reaction"
          />,
          isReachIconVisible && (
            <ReachIcon
              key="reach"
              isOpen={isReachModalOpen}
              setIsReachModalOpen={setIsReacgModalOpen}
              onClick={handleReachIconClick}
            />
          ),
          <SettingsIcon key="settings" />,
        ];
        break;
      case "/prizes":
        icons = [
          <BackIcon key="back" />,
          <ReachIcon
            key="reach"
            isOpen={isReachModalOpen}
            setIsReachModalOpen={setIsReacgModalOpen}
            onClick={handleReachIconClick}
          />,
          isReachIconVisible && (
            <ReactionsIcon
              isOpen={isReactionModalOpen}
              setIsReactionModalOpen={setIsReactionModalOpen}
              key="reaction"
            />
          ),
          <SettingsIcon key="settings" />,
        ];
        break;
      default:
        icons = [
          <PrizesIcon key="prize" />,
          <ReactionsIcon
            isOpen={isReactionModalOpen}
            setIsReactionModalOpen={setIsReactionModalOpen}
            key="reaction"
          />,
          isReachIconVisible && (
            <ReachIcon
              key="reach"
              isOpen={isReachModalOpen}
              setIsReachModalOpen={setIsReacgModalOpen}
              onClick={handleReachIconClick}
            />
          ),
          <SettingsIcon key="settings" />,
        ];
    }
    return icons.filter(Boolean);
  };

  const iconElements = Icons(props.pageName);

  return (
    <div>
      {isReactionModalOpen && (
        <ReactionStampModal
          position={position}
          height={navBarHeight}
          images={images}
          onClick={handleReactionsiconClick}
        />
      )}
      {isReachModalOpen && (
        <Modal isOpened={isReachModalOpen} setisOpened={setIsReacgModalOpen}>
          <div className={styles.reachModal}>
            <p>リーチしましたか？</p>
            <Button inversion onClick={handleReachIconClick}>
              はい
            </Button>
            <Button onClick={() => setIsReacgModalOpen(!isReachModalOpen)}>
              いいえ
            </Button>
          </div>
        </Modal>
      )}
      <Header />
      <main className={styles.content}>{props.children}</main>
      <NavigationBar ref={navRef} isCentered={iconElements.length <= 3}>
        {iconElements}
      </NavigationBar>
    </div>
  );
};

export default Layout;
