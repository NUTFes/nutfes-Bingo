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
  ReachCount,
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
  { id: 10, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 11, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 12, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 13, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 14, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 15, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 16, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 17, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 18, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 19, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 20, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
  { id: 21, number: 9, createdAt: "2024-08-01", updatedAt: "2024-08-01" },
];

const testNumber: number = 8;

const HomePage: React.FC = () => {
  const router = useRouter();
  const pageName = router.pathname;

  return (
    <div>
      {/* <NumberCardSmall BingoNumber={testBingoNumber}></NumberCardSmall> */}
      {/* <PrizeCard BingoPrize={testBingoPrize}></PrizeCard> */}
      {/* <button onClick={toggleModal}>モーダルボタン</button>
      {isModalOpen && (
        <ReactionStampModal position={testPosition} images={images} />
      )} */}
      {/* <ReachIcon /> */}
      {/* <PrizeCardList BingoPrize={testBingoPrizes} /> */}
      <Layout pageName={pageName}>
        <NumberCardList firstNumber bingoNumber={testBingoNumbers} />
      </Layout>
      {/* <ReachCount count={testNumber} /> */}
    </div>
  );
};

export default HomePage;
