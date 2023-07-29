import { useState } from "react";
import type { NextPage } from "next";
import styles from "@/styles/Home.module.css";
import { Header, Button, Modal } from "@/components/common";

const Page: NextPage = () => {
  const [isOpened, setIsOpened] = useState(false);
  const open = () => setIsOpened(true);
  const close = () => setIsOpened(false);
  return (
    <div className={styles.container}>
      <Modal isOpened={isOpened} close={close}>
        抽選された番号
        <p>25</p>
      </Modal>
      <div>
        <Header>
          <div className={styles.main}>
            <div className={styles.title}>
              <p>NUTFES BINGO USER</p>
            </div>
            <button type="button" onClick={open} className={styles.btnOpen}>
              最新の番号を表示
            </button>
            <Button />
          </div>
        </Header>
      </div>
    </div>
  );
};

export default Page;
