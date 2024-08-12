import React from "react";
import Button from "@/components/common/Button";

// ボタンの動作確認用の関数
const clickCheck = function () {
  console.log("1");
};

const App = () => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexFlow: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Button
        text="はい"
        textColor="#ff3342"
        backgroundColor="white"
        onClick={clickCheck}
      />
      <Button
        text="いいえ"
        textColor="white"
        backgroundColor="#ff3342"
        onClick={clickCheck}
      />
    </div>
  );
};

export default App;
