import { atom } from "recoil";

type AdminSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  email?: string | null;
};

const STORAGE_KEY = "admin_session";

const loadSession = (): AdminSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
};

export const adminSessionState = atom<AdminSession | null>({
  key: "adminSessionState",
  default: loadSession(),
});

export const persistAdminSession = (session: AdminSession | null) => {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};
