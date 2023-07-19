import React from 'react'
import { ReactNode } from "react"
import styles from "./BingoResult.module.css"

interface BingoResultProps {
    dataArray: number[]
}

export const BingoResult = (props: BingoResultProps) => {
  return (
        <div className={styles.container}>
          <p className={styles.frame_title}>抽選済み番号一覧</p>
          <div className={styles.card_frame}>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[0]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[1]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[2]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[3]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[4]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[5]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[6]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[7]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[8]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[9]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[10]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[11]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[12]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[13]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[14]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[15]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[16]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[17]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[18]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[19]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[20]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[21]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[22]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[23]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[24]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[25]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[26]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[27]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[28]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[29]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[30]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[31]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[32]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[33]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[34]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[35]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[36]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[37]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[38]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[39]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[40]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[41]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[42]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[43]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[44]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[45]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[46]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[47]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[48]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[49]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[50]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[51]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[52]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[53]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[54]}</p></div>
            </div>
            <div className={styles.card}>
              <div className={styles.card_content}><p>{props.dataArray[55]}</p></div>
            </div>
          </div>
        </div>

  )
}

export default BingoResult;
