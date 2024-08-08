// pages/index.tsx
import React from "react";
import { NumberCardSmall } from "@/components/common";

const testBingoNumber = {
  id: 17,
  number: 52,
  createdAt: "2024-08-01",
  updatedAt: "2024-08-01",
};

const HomePage: React.FC = () => {
  return (
    <div>
      <NumberCardSmall BingoNumber={testBingoNumber}></NumberCardSmall>
    </div>
  );
};

export default HomePage;
