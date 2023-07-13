import styles from "./LogoutButton.module.css";
import { CgLogOut } from "react-icons/cg";

const LogoutButton = () => {
  return (
    <main>
      <div className={styles.logout}>
        <button
          className={styles.button}
          onClick={() => console.log("button click")}
        >
          Logout
          <CgLogOut className={styles.icon} />
        </button>
      </div>
    </main>
  );
};

export default LogoutButton;
