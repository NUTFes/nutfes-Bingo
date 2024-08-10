// pages/index.tsx
import React from "react";
import {
  NumberCardSmall,
  PrizeCard,
  NumberCardList,
} from "@/components/common";
import { BingoNumber } from "@/type/common";

const testBingoNumber = {
  id: 17,
  number: 52,
  createdAt: "2024-08-01",
  updatedAt: "2024-08-01",
};
const testPrizeImage = {
  id: 17,
  bucketName: "bingo",
  fileName: "クラス図0.png",
  fileType: "image/png",
  createdAt: "2024-8-6",
  updatedAt: "2024-8-6",
};
const testBingoPrize = {
  id: 17,
  nameJp: "nameJpです",
  nameEn: "nameEnです",
  isWon: true,
  imageId: 17,
  createdAt: "2024-8-6",
  updatedAt: "2024-8-6",
  prizeImage: testPrizeImage,
};

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
  return (
    <div>
      {/* <NumberCardSmall BingoNumber={testBingoNumber}></NumberCardSmall> */}
      {/* <PrizeCard BingoPrize={testBingoPrize}></PrizeCard> */}
      <NumberCardList firstNumber bingoNumber={testBingoNumbers} />
    </div>
  );
};

export default HomePage;
