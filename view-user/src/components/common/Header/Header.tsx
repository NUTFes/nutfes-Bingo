import styles from "./Header.module.css";
import { useRouter } from "next/router";
import Image from "next/image";
import { IoHelpCircleOutline } from "react-icons/io5";

// ボタンの動作確認用の関数（後でヘルプに飛ぶようにする）
const goHelp = function () {
  console.log("1");
};

const Header = () => {
  const router = useRouter();
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <Image
          className={styles.logo}
          src="/Bingo_logo.png"
          alt="sample"
          width={300}
          height={300}
          onClick={() => router.push("/")}
        />
        <button className={styles.icon} onClick={goHelp}>
          <IoHelpCircleOutline />
        </button>
      </div>
    </div>
  );
};

export default Header;
