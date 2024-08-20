import React, { useState } from "react";
import {
  NumberCardList,
  ReactionStampModal,
  ToggleButton,
  ReachIcon,
  PrizeCardList,
  PrizeCard,
  NavigationBar,
  PrizesIcon,
} from "@/components/common";
import Layout from "@/components/Layout";
import { BingoNumber, BingoPrize, PrizeImage } from "@/type/common";
import { useRouter } from "next/router";

const testBingoNumbers: BingoNumber[] = [
  { id: 1, number: 1, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 2, number: 2, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 3, number: 3, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 4, number: 4, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 5, number: 5, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 6, number: 6, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 7, number: 7, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 8, number: 8, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 9, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
];

const HomePage: React.FC = () => {
  const router = useRouter();
  const pageName = router.pathname;

const App = () => {
  return (
    <div>
      {/* <NumberCardSmall BingoNumber={testBingoNumber}></NumberCardSmall> */}
      {/* <PrizeCard BingoPrize={testBingoPrize}></PrizeCard> */}
      {/* <NumberCardList firstNumber bingoNumber={testBingoNumbers} />
      <button onClick={toggleModal}>モーダルボタン</button>
      {isModalOpen && (
        <ReactionStampModal position={testPosition} images={images} />
      )} */}
      {/* <ReachIcon /> */}
      {/* <PrizeCardList BingoPrize={testBingoPrizes} /> */}
      <Layout pageName={pageName}>hello</Layout>
    </div>
  );
};

export default HomePage;