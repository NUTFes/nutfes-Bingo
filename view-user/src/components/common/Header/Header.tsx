import React from 'react'
import { ReactNode } from "react"
import styles from "./Header.module.css"
import { Logoutbutton } from "./Logoutbutton"
interface HeaderProps {
    user: string;
}

export const Header = (props: HeaderProps) =>  {
    return (
        <div className={styles.container}>
            <div className={styles.title}>
                <p>NUTFES BINGO {props.user}</p>
                <Logoutbutton title = "hello" onClick={() => console.log('button click')}/>
            </div>
        </div>
    )
}

export default Header
