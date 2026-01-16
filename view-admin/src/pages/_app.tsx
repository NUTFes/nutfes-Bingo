import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Flip, ToastContainer } from "react-toastify";
import { RecoilRoot } from "recoil";
import RequireAdmin from "@/components/common/RequireAdmin";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
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
      <RecoilRoot>
        {router.pathname !== "/login" && <RequireAdmin />}
        <Component {...pageProps} />
      </RecoilRoot>
    </>
  );
}
