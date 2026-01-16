import { useEffect } from "react";
import { useRouter } from "next/router";
import { useRecoilState } from "recoil";
import { adminSessionState, persistAdminSession } from "@/state/adminSession";
import { supabase } from "@/lib/supabase";

const RequireAdmin = () => {
  const router = useRouter();
  const [session, setSession] = useRecoilState(adminSessionState);

  useEffect(() => {
    if (!session?.accessToken) {
      router.replace("/login");
      return;
    }
    if (session.expiresAt && Date.now() / 1000 > session.expiresAt) {
      setSession(null);
      persistAdminSession(null);
      router.replace("/login");
      return;
    }
    if (!session.refreshToken) {
      setSession(null);
      persistAdminSession(null);
      router.replace("/login");
      return;
    }
    const applySession = async () => {
      const { error } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
      if (error) {
        setSession(null);
        persistAdminSession(null);
        router.replace("/login");
      }
    };
    void applySession();
  }, [router, session, setSession]);

  return null;
};

export default RequireAdmin;
