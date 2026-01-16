"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ToastContainer, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminStore } from "@/stores/useAdminStore";

const supabase = createSupabaseBrowserClient();

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const setAuthenticated = useAdminStore((state) => state.setAuthenticated);
  const logout = useAdminStore((state) => state.logout);
  const [checking, setChecking] = useState(true);
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    const verifySession = async () => {
      if (isLogin) {
        setChecking(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        logout();
        router.replace("/admin/login");
        setChecking(false);
        return;
      }

      setAuthenticated(data.session.user.email ?? "");
      setChecking(false);
    };

    void verifySession();
  }, [isLogin, logout, router, setAuthenticated]);

  if (!isLogin && checking) {
    return null;
  }

  return (
    <>
      <ToastContainer
        toastClassName={"rounded-lg min-w-96 text-center"}
        position="bottom-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Flip}
      />
      {children}
    </>
  );
}
