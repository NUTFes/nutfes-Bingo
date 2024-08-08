// pages/index.tsx
import React from "react";
import { NumberCardSmall, PrizeCard } from "@/components/common";

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

const HomePage: React.FC = () => {
  return (
    <div>
      {/* <NumberCardSmall BingoNumber={testBingoNumber}></NumberCardSmall> */}
      <PrizeCard BingoPrize={testBingoPrize}></PrizeCard>
    </div>
  );
};

export default HomePage;
