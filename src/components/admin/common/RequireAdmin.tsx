"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminStore } from "@/stores/useAdminStore";

const RequireAdmin = () => {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  const logout = useAdminStore((state) => state.logout);
  const setAuthenticated = useAdminStore((state) => state.setAuthenticated);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (pathname === "/admin/login") return;
    const applySession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        logout();
        router.replace("/admin/login");
        return;
      }
      setAuthenticated(data.session.user.email ?? "");
    };
    void applySession();
  }, [pathname, logout, router, setAuthenticated, supabase]);

  return null;
};

export default RequireAdmin;
