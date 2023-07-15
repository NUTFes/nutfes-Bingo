import React from "react";
import { ReactNode } from "react";
import styles from "./Header.module.css";
import LogoutButton from "@/components/common/LogoutButton";
import { Modal } from "@/components/common";

interface HeaderProps {
  user: string;
}

const Header = (props: HeaderProps) =>  {
    return (
        <div className={styles.container}>
            <div className={styles.main}>
                <div className={styles.title}>
                    <p>NUTFES BINGO {props.user}</p>
                </div>
                <div>
                    <Modal buttonText="最新の番号を表示">
                        <div className={styles.modalContent}>
                            抽選された番号
                            <p>25</p>
                        </div>
                    </Modal>
                </div>
            </div>
        </div>
    )
}

export default Header;
