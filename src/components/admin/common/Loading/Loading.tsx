const Loading = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--admin-overlay)_84%,transparent)] p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface)_94%,transparent)] p-7 text-[var(--admin-text)] shadow-xl">
        <p
          className="text-2xl tracking-wider text-[var(--main-color)]"
          style={{ fontFamily: 'var(--font-silom), "Noto Sans JP", sans-serif' }}
        >
          Admin Console
        </p>
        <svg
          className="size-12 fill-[var(--main-color)]"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <title>読み込み中</title>
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
        <p className="text-base sm:text-lg">管理画面を読み込み中...</p>
      </div>
    </div>
  );
};

export default Loading;
