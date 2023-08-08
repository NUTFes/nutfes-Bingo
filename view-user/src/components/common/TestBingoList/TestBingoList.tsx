import React, { useEffect, useState } from "react";
import { getBingoNumber, BingoNumber, subscriptionBingoNumber } from "@/utils/api_methods";

function TestBingoList() {
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);

  useEffect(() => {
    async function fetchBingoNumbers() {
      try {
        const response: BingoNumber[] = await subscriptionBingoNumber();
        if (response) {
          setBingoNumbers(response);
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }

    fetchBingoNumbers();
  }, [bingoNumbers]);

  return (
    <div>
      <h1>Bingo Number List</h1>
      <ul>
        {bingoNumbers.map((item, index) => (
          <li key={index}>ID{item.id}番号{item.data}</li>
        ))}
      </ul>
    </div>
  );
}

export default TestBingoList;
