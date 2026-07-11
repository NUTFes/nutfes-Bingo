import { useBingoSocket } from "./use-bingo-socket";

export function PrizesView() {
  const realtime = useBingoSocket();
  if (!realtime.snapshot)
    return (
      <main className="center-page">
        <div className="spinner" aria-label="Loading" />
      </main>
    );
  const language = localStorage.getItem("bingo.language") === "en" ? "en" : "ja";
  return (
    <main className="participant-shell">
      <header className="topbar">
        <a className="brand" href="/">
          ← {language === "ja" ? "ビンゴに戻る" : "Back to bingo"}
        </a>
      </header>
      <section className="panel">
        <div className="section-heading">
          <h1>{language === "ja" ? "景品一覧" : "Prizes"}</h1>
          <span>{realtime.snapshot.prizes.length}</span>
        </div>
        <div className="prize-grid">
          {realtime.snapshot.prizes.map((prize) => (
            <article className={prize.isWon ? "prize-card won" : "prize-card"} key={prize.id}>
              {prize.imageUrl ? (
                <img src={prize.imageUrl} alt="" loading="lazy" />
              ) : (
                <div className="image-placeholder">🎁</div>
              )}
              <div>
                <h2>{language === "ja" ? prize.nameJa : prize.nameEn}</h2>
                {prize.isWon && (
                  <span className="won-badge">{language === "ja" ? "当選済み" : "Awarded"}</span>
                )}
              </div>
            </article>
          ))}
          {realtime.snapshot.prizes.length === 0 && (
            <p>{language === "ja" ? "景品はまだ登録されていません。" : "No prizes yet."}</p>
          )}
        </div>
      </section>
    </main>
  );
}
