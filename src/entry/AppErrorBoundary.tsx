import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router";

import type { SiteArea } from "@/site-pages";

type Props = { children: ReactNode; area: SiteArea };
type State = { error: Error | null };

class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  retry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    if (this.props.area === "admin") {
      return (
        <div className="flex h-screen items-center justify-center bg-background px-4 py-10">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card/90 p-6 text-center text-card-foreground shadow-2xl sm:p-7">
            <p className="mb-2 text-base font-semibold sm:text-lg">
              管理画面でエラーが発生しました。
            </p>
            <p className="mb-5 text-sm text-muted-foreground">お手数ですが、再試行してください。</p>
            <button
              type="button"
              onClick={this.retry}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              再試行
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#121212] text-center text-[#e0e0e0]">
        <p className="mb-4 text-sm text-[#a0a0a0]">エラーが発生しました。</p>
        <button
          type="button"
          onClick={this.retry}
          className="cursor-pointer rounded border-none bg-blue-600 px-4 py-2 text-sm text-white"
        >
          再試行
        </button>
      </div>
    );
  }
}

export function RouteErrorBoundary({ children, area }: Props) {
  const { pathname } = useLocation();
  return (
    <AppErrorBoundary key={pathname} area={area}>
      {children}
    </AppErrorBoundary>
  );
}
