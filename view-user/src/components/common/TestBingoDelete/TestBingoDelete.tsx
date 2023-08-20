import React, { useState } from 'react';
import { deleteBingoNumber } from '@/utils/api_methods';


function TestBIngoDelete() {
  const [data, setData] = useState(0);

  const handleFormSubmit = async (e: React.ChangeEvent<any>) => {
    e.preventDefault();

    const BingoNumber = await deleteBingoNumber(data);
    if (BingoNumber) {
      console.log('Bingo number deleted:', BingoNumber);
      setData(0); // フォームをクリア
    } else {
      console.error('Failed to delete bingo number.',Error);
    }
  };

  return (
    <div>
      <h1>delete Component</h1>
      <form onSubmit={handleFormSubmit}>
        <input
          type="number"
          value={data}
          onChange={(e) => setData(parseInt(e.target.value))}
        />
        <button type="submit">Delete Bingo Number</button>
      </form>
    </div>
  );
}

export default TestBIngoDelete;
