import React, { ReactNode } from "react";
import styles from "./Header.module.css";

interface HeaderProps {
    children: ReactNode;
}

const Header = ({ children }: HeaderProps) => {
    return (
        <div className={styles.container}>
            {children}
        </div>
    );
};

export default Header;
