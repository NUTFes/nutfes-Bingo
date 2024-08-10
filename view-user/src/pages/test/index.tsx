// pages/index.tsx
import React, { useState } from "react";
import {
  NumberCardSmall,
  PrizeCard,
  ReactionStampModal,
} from "@/components/common";

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

const images = [
  { src: "/ReactionIcon/crap.png", alt: "crap icon" },
  { src: "/ReactionIcon/good.png", alt: " good icon" },
  { src: "/ReactionIcon/cracker.png", alt: "cracker icon" },
  { src: "/ReactionIcon/heart.png", alt: "heart icon" },
  { src: "/ReactionIcon/smile.png", alt: "smile icon" },
  { src: "/ReactionIcon/angry.png", alt: "angry icon" },
  { src: "/ReactionIcon/skull.png", alt: "skull icon" },
  { src: "/ReactionIcon/surprise.png", alt: "surprise icon" },
];

const testPosition: string = "50%";

const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div>
      {/* <NumberCardSmall BingoNumber={testBingoNumber}></NumberCardSmall> */}
      {/* <PrizeCard BingoPrize={testBingoPrize}></PrizeCard> */}
      <button onClick={toggleModal}>モーダルボタン</button>
      {isModalOpen && (
        <ReactionStampModal position={testPosition} images={images} />
      )}
    </div>
  );
};

export default HomePage;
