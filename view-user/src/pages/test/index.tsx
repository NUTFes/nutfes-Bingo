// pages/index.tsx
import React, { useState } from "react";
import {
  NumberCardSmall,
  PrizeCard,
  NumberCardList,
  ReactionStampModal,
  ReactionsIcon,
} from "@/components/common";
import { BingoNumber } from "@/type/common";

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

const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      {/* <NumberCardSmall BingoNumber={testBingoNumber}></NumberCardSmall> */}
      {/* <PrizeCard BingoPrize={testBingoPrize}></PrizeCard> */}
      {/* <NumberCardList firstNumber bingoNumber={testBingoNumbers} /> */}
      <ReactionsIcon isOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
      {isModalOpen && (
        <ReactionStampModal position={testPosition} images={images} />
      )}
    </div>
  );
};

export default HomePage;
