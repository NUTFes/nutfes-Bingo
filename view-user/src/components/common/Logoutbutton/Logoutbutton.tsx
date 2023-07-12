import styles from "./Logoutbutton.module.css";

const Logoutbutton = ({
  title = "",
  onClick = () => undefined,
}: Props) => {
  return (
    <button className={styles.button} onClick={onClick}>
      {title}
    </button>
  );
};

type Props = {
  title: string;
  onClick?: () => void;
};

export default Logoutbutton;
