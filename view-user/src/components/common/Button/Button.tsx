import styles from "./Button.module.css";
import { CgLogOut } from "react-icons/cg";
import classNames from "classnames";


const Button = ({
  theme = "primary",
  size = "l",
  shape = "circle",
  ...props
}) => {

  return (
    <main>
      <div>
        <button
          className={classNames(styles[theme],styles[size],styles[shape])}
          onClick={() => console.log("button click")}
        >
          Logout
          <CgLogOut className={styles.icon} />
        </button>
      </div>
    </main>
  );
};

export default Button;
