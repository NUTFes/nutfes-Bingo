import React, { useState } from "react";
import { Modal } from "@/components/common";

const App: React.FC = () => {
  const [isModalOpened, setIsModalOpened] = useState(true);

  const openModal = () => {
    setIsModalOpened(true);
  };

  const closeModal = () => {
    setIsModalOpened(false);
  };

  return (
    <div>
      <Modal isOpened={isModalOpened} setisOpened={setIsModalOpened}>
        <p>リーチしましたか</p>
        <div>
          <button onClick={closeModal}>はい</button>
        </div>
        <div>
          <button onClick={closeModal}>いいえ</button>
        </div>
      </Modal>
    </div>
  );
};

export default App;
