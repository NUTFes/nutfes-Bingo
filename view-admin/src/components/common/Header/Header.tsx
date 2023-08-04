import React from 'react'
import { ReactNode } from "react"
import styles from "./Header.module.css"

interface HeaderProps {
    children: ReactNode;
    user: string;
}

const Header = ({ children, user }: HeaderProps) => {
    return (
    <div className={styles.container}>
        <div className={styles.main}>
            <div className={styles.title}>
                <p>NUTFES BINGO {user}</p>
            </div>
            <div>
                {children}
            </div>
        </div>
    </div>
    );
};

export default Header
