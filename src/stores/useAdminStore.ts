import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminState {
  isAuthenticated: boolean;
  email: string | null;
  setAuthenticated: (email: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      email: null,
      setAuthenticated: (email) => set({ isAuthenticated: true, email }),
      logout: () => set({ isAuthenticated: false, email: null }),
    }),
    { name: "admin-session" },
  ),
);
