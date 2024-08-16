import React from "react";
import { Button } from "@/components/common";

// ボタンの動作確認用の関数
const clickCheck = function () {
  console.log("1");
};

const App = () => {
  return (
    <div>
      <Button inversion={false}>
        <div>はい</div>
      </Button>
      <Button inversion={true}>
        <div>いいえ</div>
      </Button>
    </div>
  );
};

export default App;
