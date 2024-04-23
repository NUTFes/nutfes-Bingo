import { type ReactNode } from "react";
import styles from "./HelpModal.module.css";
import { RxCross1 } from "react-icons/rx";
import Image from "next/image";

interface HelpModalProps {
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setIsOpened: (isOpened: boolean) => void;
}

const HelpModal = ({
  isOpened,
  canCloseByClickingBackground = true,
  setIsOpened,
}: HelpModalProps) => {
  const closeModal = () => {
    setIsOpened(false);
  };

  return (
    <>
      {isOpened && (
        <div className={styles.wrapper}>
          <div className={styles.content}>
            <button className={styles.btnClose} onClick={closeModal}>
              <RxCross1 />
            </button>

            {/* 番号表示ページ */}
            <div className={styles.card}>
              <p className={styles.card__title}>番号表示ページ</p>
              <div className={styles.card__description}>
                <div className={styles.card__2colimage}>
                  <div className={styles.card__image1}>
                    <Image
                      src="/HelpModal/NumberPage1.png"
                      alt="番号表示ページ (開始前)"
                      width={4000}
                      height={8558}
                      sizes="(max-width:480px) 90vw,(max-width:1200px) 75vw,50vw"
                      // fill
                      // style={{ objectFit: "contain" }}
                    />
                    <p>
                      ビンゴ大会開始前に
                      <br />
                      アクセスした場合の画面
                    </p>
                  </div>
                  <div className={styles.card__image2}>
                    <Image
                      src="/HelpModal/NumberPage2.png"
                      alt="番号表示ページ (開始前)"
                      width={4000}
                      height={8558}
                      sizes="(max-width:480px) 90vw,(max-width:1200px) 75vw,50vw"
                      // fill
                      // style={{ objectFit: "contain" }}
                    />
                    <p>
                      ビンゴ大会開催中に
                      <br />
                      アクセスした場合の画面
                    </p>
                  </div>
                </div>

                <p>数字並び替え機能</p>
                <div className={styles.card__2colimage}>
                  <div className={styles.card__image1}>
                    <Image
                      src="/HelpModal/NumberPage2.png"
                      alt="番号表示ページ (開始前)"
                      width={4000}
                      height={8558}
                      sizes="(max-width:480px) 90vw,(max-width:1200px) 75vw,50vw"
                      // fill
                      // style={{ objectFit: "contain" }}
                    />
                    <p>
                      右上のボタンが「番号順」
                      <br />
                      となっている時，
                      <br />
                      ビンゴ大会で抽選された
                      <br />
                      番号順に表示
                    </p>
                  </div>
                  <div className={styles.card__image2}>
                    <Image
                      src="/HelpModal/NumberPage3.png"
                      alt="番号表示ページ (開始前)"
                      width={4000}
                      height={8558}
                      sizes="(max-width:480px) 90vw,(max-width:1200px) 75vw,50vw"
                      // fill
                      // style={{ objectFit: "contain" }}
                    />
                    <p>
                      右上のボタンが「抽選順」
                      <br />
                      となっている時，
                      <br />
                      番号順に表示
                    </p>
                  </div>
                </div>
              </div>

              {/* 景品ページ */}
              <p className={styles.card__title}>景品表示ページ</p>
              <div className={styles.card__description}>
                <div className={styles.card__2colimage}>
                  <div className={styles.card__image1}>
                    <Image
                      src="/HelpModal/PrizePage1.png"
                      alt="番号表示ページ (開始前)"
                      width={4000}
                      height={8558}
                      sizes="(max-width:480px) 90vw,(max-width:1200px) 75vw,50vw"
                      // fill
                      // style={{ objectFit: "contain" }}
                    />
                    <p>
                      ビンゴ大会開始前の
                      <br />
                      景品一覧
                    </p>
                  </div>
                  <div className={styles.card__image2}>
                    <Image
                      src="/HelpModal/PrizePage2.png"
                      alt="番号表示ページ (開始前)"
                      width={4000}
                      height={8558}
                      sizes="(max-width:480px) 90vw,(max-width:1200px) 75vw,50vw"
                      // fill
                      // style={{ objectFit: "contain" }}
                    />
                    <p>
                      ビンゴ大会開催中に
                      <br />
                      既に当選した景品には
                      <br />
                      「当選！」の文字が表示
                    </p>
                  </div>
                </div>
              </div>

              {/* ページ遷移 */}
              <p className={styles.card__title}>
                番号一覧ページ・景品一覧ページ 切り替え
              </p>
              <div className={styles.card__description}>
                <div className={styles.card__2colimage}>
                  <div className={styles.card__image1}>
                    <Image
                      src="/HelpModal/ChangePageToPrize.png"
                      alt="番号表示ページ (開始前)"
                      width={4000}
                      height={8558}
                      sizes="(max-width:480px) 90vw,(max-width:1200px) 75vw,50vw"
                      // fill
                      // style={{ objectFit: "contain" }}
                    />
                    <p>
                      番号一覧ページから
                      <br />
                      景品一覧ページに
                      <br />
                      移動するときは，
                      <br />
                      画面右上の「景品一覧」の
                      <br />
                      ボタンをクリック
                    </p>
                  </div>
                  <div className={styles.card__image2}>
                    <Image
                      src="/HelpModal/ChangePageToNumber.png"
                      alt="番号表示ページ (開始前)"
                      width={4000}
                      height={8558}
                      sizes="(max-width:480px) 90vw,(max-width:1200px) 75vw,50vw"
                      // fill
                      // style={{ objectFit: "contain" }}
                    />
                    <p>
                      景品一覧ページから
                      <br />
                      番号一覧ページに
                      <br />
                      移動するときは，
                      <br />
                      画面右上の「番号一覧」の
                      <br />
                      ボタンをクリック
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {canCloseByClickingBackground && (
            <div className={styles.background} onClick={closeModal} />
          )}
        </div>
      )}
    </>
  );
};

export default HelpModal;
