import React, { useState } from 'react';
import { createBingoNumber } from '@/utils/api_methods'; // utilsファイルからcreateBingoNumberをインポート


function TestBIngoCreate() {
  const [data, setData] = useState(0);

  const handleFormSubmit = async (e: React.ChangeEvent<any>) => {
    e.preventDefault();

    const newBingoNumber = await createBingoNumber(data);
    if (newBingoNumber) {
      console.log('Bingo number created:', newBingoNumber);
      setData(0); // フォームをクリア
    } else {
      console.error('Failed to create bingo number.');
    }
  };

  return (
    <div>
      <h1>Other Component</h1>
      <form onSubmit={handleFormSubmit}>
        <input
          type="number"
          value={data}
          onChange={(e) => setData(parseInt(e.target.value))}
        />
        <button type="submit">Add Bingo Number</button>
      </form>
    </div>
  );
}

export default TestBIngoCreate;
