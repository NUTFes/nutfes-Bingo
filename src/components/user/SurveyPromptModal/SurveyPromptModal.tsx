import Button from "@/components/user/buttons/Button/Button";
import Modal from "@/components/user/Modal/Modal";

import styles from "./SurveyPromptModal.module.css";

interface SurveyPromptModalProps {
  isOpened: boolean;
  setIsOpened: (isOpened: boolean) => void;
  surveyUrl: string;
}

const SurveyPromptModal = ({ isOpened, setIsOpened, surveyUrl }: SurveyPromptModalProps) => {
  const openSurvey = () => {
    if (surveyUrl) {
      window.open(surveyUrl, "_blank", "noopener,noreferrer");
    }
    setIsOpened(false);
  };

  return (
    <Modal isOpened={isOpened} setIsOpened={setIsOpened}>
      <div className={styles.container}>
        <p className={styles.title}>アンケートが届きました</p>
        <p className={styles.description}>回答のご協力をお願いします。</p>
        <div className={styles.actions}>
          <Button inversion onClick={openSurvey}>
            回答する
          </Button>
          <Button onClick={() => setIsOpened(false)}>あとで</Button>
        </div>
      </div>
    </Modal>
  );
};

export default SurveyPromptModal;
