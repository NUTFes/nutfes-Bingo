"use client";

import { useFormState, useFormStatus } from "react-dom";
import styles from "@/styles/Login.module.css";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {
  error: null,
};

const SubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.button} disabled={pending}>
      {pending ? "ログイン中..." : "ログイン"}
    </button>
  );
};

const LoginForm = () => {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>管理者ログイン</h1>
        <form action={formAction} className={styles.form}>
          <label className={styles.label}>
            メールアドレス
            <input type="email" name="email" className={styles.input} required />
          </label>
          <label className={styles.label}>
            パスワード
            <input type="password" name="password" className={styles.input} required />
          </label>
          {state.error && <p className={styles.error}>{state.error}</p>}
          <SubmitButton />
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
