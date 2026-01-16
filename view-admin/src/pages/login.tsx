import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import styles from "@/styles/Login.module.css";
import { useRecoilState } from "recoil";
import { adminSessionState, persistAdminSession } from "@/state/adminSession";
import { toast } from "react-toastify";

const LoginPage = () => {
  const router = useRouter();
  const [, setSession] = useRecoilState(adminSessionState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "ログインに失敗しました");
      }
      const data = await res.json();
      const nextSession = {
        accessToken: data.session.access_token as string,
        refreshToken: data.session.refresh_token as string,
        expiresAt: data.session.expires_at as number | undefined,
        email: data.user?.email ?? null,
      };
      setSession(nextSession);
      persistAdminSession(nextSession);
      toast.success("ログインしました");
      router.replace("/");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "ログインに失敗しました",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>管理者ログイン</h1>
        <form onSubmit={submit} className={styles.form}>
          <label className={styles.label}>
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
            />
          </label>
          <label className={styles.label}>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
          </label>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
