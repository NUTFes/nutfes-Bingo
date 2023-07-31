import styles from "./Button.module.css";
import { CgLogOut } from "react-icons/cg";
import classNames from "classnames";

const Button = ({ theme = "primary", size = "l", shape = "circle" }) => {
  return (
    <main>
      <div>
        <button
          className={classNames(styles[theme], styles[size], styles[shape])}
          onClick={() => console.log("button click")}
        >
          <div className={styles.contents}>
            <CgLogOut className={styles.icon} />
            <p>Logout</p>
          </div>
        </button>
      </div>
    </main>
  );
};

export default Button;
