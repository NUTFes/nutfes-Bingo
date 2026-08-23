"use client";

import { useCallback, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";

import Button from "@/components/user/buttons/Button";
import Modal from "@/components/user/Modal";
import Turnstile, { type TurnstileHandle } from "@/components/user/Turnstile/Turnstile";
import TurnstileScript from "@/components/user/Turnstile/TurnstileScript";
import { recordPublicReach } from "@/features/user/actions/bingo-public";

import styles from "./ReachConfirmationModal.module.css";

type ReachCopy = {
  ariaLabel: string;
  title: string;
  yes: string;
  no: string;
  verificationPending: string;
  verificationError: string;
};

type ReachConfirmationModalProps = {
  copy: ReachCopy;
  language: "ja" | "en";
  onClose: () => void;
  onConfirmed: () => void;
};

function getActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function ReachConfirmationModal({
  copy,
  language,
  onClose,
  onConfirmed,
}: ReachConfirmationModalProps) {
  const [state, setState] = useState({
    isSending: false,
    isWaitingForVerification: false,
    error: null as string | null,
    token: null as string | null,
  });
  const turnstileRef = useRef<TurnstileHandle>(null);
  const pendingConfirmationRef = useRef(false);
  const requestInFlightRef = useRef(false);

  const submitReach = useCallback(
    async (submittedToken: string) => {
      if (requestInFlightRef.current) return;

      requestInFlightRef.current = true;
      pendingConfirmationRef.current = false;
      setState({
        isSending: true,
        isWaitingForVerification: false,
        error: null,
        token: null,
      });
      try {
        await recordPublicReach(submittedToken);
        onConfirmed();
        onClose();
      } catch (error) {
        turnstileRef.current?.reset();
        setState({
          isSending: false,
          isWaitingForVerification: false,
          error: getActionErrorMessage(error, "リーチ送信に失敗しました。"),
          token: null,
        });
      } finally {
        requestInFlightRef.current = false;
      }
    },
    [onClose, onConfirmed],
  );

  const handleConfirm = () => {
    if (state.isSending || state.isWaitingForVerification) return;
    if (state.token !== null) {
      void submitReach(state.token);
      return;
    }

    pendingConfirmationRef.current = true;
    setState((previous) => ({
      ...previous,
      isWaitingForVerification: true,
      error: null,
    }));
  };

  const isProcessing = state.isSending || state.isWaitingForVerification;
  const handleClose = () => {
    if (state.isSending) return;

    pendingConfirmationRef.current = false;
    onClose();
  };

  return (
    <Modal
      isOpened
      setIsOpened={(isOpened) => {
        if (!isOpened) handleClose();
      }}
      canCloseByClickingBackground={!state.isSending}
      ariaLabel={copy.ariaLabel}
    >
      <div className={styles.reachModal}>
        <div className={styles.reachIconWrapper}>
          <PartyPopper className={styles.reachModalIcon} />
        </div>
        <h2 className={styles.reachModalTitle}>{copy.title}</h2>
        <TurnstileScript />
        <Turnstile
          ref={turnstileRef}
          language={language}
          onTokenChange={(token) => {
            setState((previous) => ({
              ...previous,
              error: token === null ? previous.error : null,
              token,
            }));
            if (token !== null && pendingConfirmationRef.current) {
              void submitReach(token);
            }
          }}
          onError={() => {
            pendingConfirmationRef.current = false;
            setState((previous) =>
              previous.isSending
                ? previous
                : {
                    ...previous,
                    isWaitingForVerification: false,
                    error: copy.verificationError,
                    token: null,
                  },
            );
          }}
        />
        {state.isWaitingForVerification && (
          <p className={styles.verificationStatus} aria-live="polite">
            {copy.verificationPending}
          </p>
        )}
        <Button disabled={isProcessing} onClick={handleConfirm}>
          {isProcessing ? (
            <>
              <span className={styles.visuallyHidden}>{copy.yes}</span>
              <div className={styles.spinner} aria-hidden="true" />
            </>
          ) : (
            copy.yes
          )}
        </Button>
        <button
          type="button"
          className={styles.cancelButton}
          disabled={state.isSending}
          onClick={handleClose}
        >
          {copy.no}
        </button>
        {state.error && (
          <p className={styles.reachError} role="alert">
            {state.error}
          </p>
        )}
      </div>
    </Modal>
  );
}
