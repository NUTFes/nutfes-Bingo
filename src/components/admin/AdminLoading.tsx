interface AdminLoadingProps {
  error?: string | null;
}

export default function AdminLoading({ error = null }: AdminLoadingProps) {
  return (
    <output
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-md"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3.5 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl sm:p-7">
        <p className="text-xl font-semibold tracking-[0.08em] sm:text-2xl">Admin Console</p>
        {error ? (
          <>
            <p className="text-center text-sm text-destructive sm:text-base" role="alert">
              {error}
            </p>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              再読み込み
            </button>
          </>
        ) : (
          <>
            <svg
              className="size-11 fill-current sm:size-12"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
                opacity=".25"
              />
              <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  dur="0.8s"
                  values="0 12 12;360 12 12"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
            <p className="text-sm text-muted-foreground sm:text-base">管理画面を読み込み中...</p>
          </>
        )}
      </div>
    </output>
  );
}
