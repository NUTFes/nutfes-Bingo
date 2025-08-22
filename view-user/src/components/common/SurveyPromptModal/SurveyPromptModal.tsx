import { Modal, Button } from "@/components/common";
import styles from "./SurveyPromptModal.module.css";

interface Props {
  isOpened: boolean;
  setIsOpened: (value: boolean) => void;
  surveyUrl?: string;
}

const SurveyPromptModal = ({ isOpened, setIsOpened, surveyUrl }: Props) => {
  const handleAnswer = () => {
    if (surveyUrl) window.open(surveyUrl, "_blank", "noopener,noreferrer");
    setIsOpened(false);
  };

  return (
    <Modal isOpened={isOpened} setIsOpened={setIsOpened}>
      <div className={styles.container}>
        <p className={styles.title}>アンケートにご協力ください</p>
        <div className={styles.actions}>
          <Button inversion onClick={handleAnswer}>
            回答する
          </Button>
          <Button onClick={() => setIsOpened(false)}>閉じる</Button>
        </div>
      </div>
    </Modal>
  );
};

export default SurveyPromptModal;
