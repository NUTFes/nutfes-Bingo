import Button from "@/components/user/buttons/Button/Button";
import Modal from "@/components/user/Modal/Modal";
import styles from "./SurveyPromptModal.module.css";

interface SurveyPromptModalProps {
  isOpened: boolean;
  setIsOpened: (isOpened: boolean) => void;
  surveyTitle: string;
  surveyDescription: string;
  surveyButtonLabel: string;
  onAnswer: () => void;
}

const SurveyPromptModal = ({
  isOpened,
  setIsOpened,
  surveyTitle,
  surveyDescription,
  surveyButtonLabel,
  onAnswer,
}: SurveyPromptModalProps) => {
  return (
    <Modal isOpened={isOpened} setIsOpened={setIsOpened} ariaLabel={surveyTitle}>
      <div className={styles.container}>
        <h2 className={styles.title}>{surveyTitle}</h2>
        <p className={styles.description}>{surveyDescription}</p>
        <div className={styles.actions}>
          <Button onClick={onAnswer}>{surveyButtonLabel}</Button>
          <Button inversion onClick={() => setIsOpened(false)}>
            あとで
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SurveyPromptModal;
