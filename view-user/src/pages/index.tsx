import { useState } from "react";
import type { NextPage } from "next";
import styles from "@/styles/Home.module.css";
import { Header, Button, Modal } from "@/components/common";
import { CgLogOut } from "react-icons/cg";

const Page: NextPage = () => {
  const [isOpened, setIsOpened] = useState(false);
  const isopenBool = () => setIsOpened(!isOpened);

  return (
    <div className={styles.container}>
      <Modal isOpened={isOpened} setisOpened={setIsOpened}>
        抽選された番号
        <p>25</p>
      </Modal>
      <Header user="USER">
        <div className={styles.main}>
          <button type="button" onClick={isopenBool} className={styles.btnOpen}>
            最新の番号を表示
          </button>
          <Button size="l" shape="circle">
            <div className={styles.contents}>
              <CgLogOut className={styles.icon} />
              <p>Logout</p>
            </div>
          </Button>
        </div>
      </Header>
    </div>
  );
};

export default Page;
