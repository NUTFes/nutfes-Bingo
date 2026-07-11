import { useEffect, useState } from "react";

import { REACTION_NAMES, type ReactionName } from "../shared/protocol";
import { submitReach } from "./api";
import { useBingoSocket } from "./use-bingo-socket";
import { useReactionSender } from "./use-reactions";

const REACTION_EMOJI: Record<ReactionName, string> = {
  angry: "😠",
  cracker: "🎉",
  crap: "💩",
  good: "👍",
  heart: "❤️",
  peace: "✌️",
  sad: "😢",
  skull: "💀",
  smile: "😊",
  surprise: "😮",
};

const COPY = {
  ja: {
    title: "NUTFes ビンゴ",
    latest: "最新番号",
    drawn: "抽選済み番号",
    drawOrder: "抽選順",
    ascending: "昇順",
    reach: "リーチ！",
    reached: "送信済み",
    prizes: "景品一覧",
    survey: "アンケートに回答",
    reactions: "リアクション",
    offline: "オフライン — 最後に受信した状態を表示中",
    retry: "再同期",
  },
  en: {
    title: "NUTFes Bingo",
    latest: "Latest number",
    drawn: "Drawn numbers",
    drawOrder: "Draw order",
    ascending: "Ascending",
    reach: "Reach!",
    reached: "Submitted",
    prizes: "Prizes",
    survey: "Open survey",
    reactions: "Reactions",
    offline: "Offline — showing the last received state",
    retry: "Resync",
  },
} as const;

export function HomeView() {
  const realtime = useBingoSocket();
  const reactions = useReactionSender();
  const [language, setLanguage] = useState<keyof typeof COPY>(() =>
    localStorage.getItem("bingo.language") === "en" ? "en" : "ja",
  );
  const [ascending, setAscending] = useState(
    () => localStorage.getItem("bingo.order") === "ascending",
  );
  const [dark, setDark] = useState(() => localStorage.getItem("bingo.theme") !== "light");
  const [reachSent, setReachSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const text = COPY[language];

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("bingo.theme", dark ? "dark" : "light");
  }, [dark]);

  if (!realtime.snapshot) {
    return (
      <main className="center-page">
        <div className="spinner" aria-label="Loading" />
        {realtime.error && <p>{realtime.error}</p>}
      </main>
    );
  }

  const snapshot = realtime.snapshot;
  const numbers = ascending
    ? snapshot.numbers.toSorted((left, right) => left.number - right.number)
    : snapshot.numbers;

  const handleReach = async () => {
    try {
      const result = await submitReach();
      setReachSent(true);
      setNotice(result.accepted ? `${text.reach} (${result.count})` : text.reached);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed");
    }
  };

  return (
    <main className="participant-shell">
      <header className="topbar">
        <a className="brand" href="/">
          {text.title}
        </a>
        <nav className="toolbar" aria-label="Preferences">
          <button
            type="button"
            className="icon-button"
            onClick={() => setDark((value) => !value)}
            aria-label="Toggle dark mode"
          >
            {dark ? "☀" : "☾"}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              const next = language === "ja" ? "en" : "ja";
              setLanguage(next);
              localStorage.setItem("bingo.language", next);
            }}
          >
            {language === "ja" ? "EN" : "日本語"}
          </button>
        </nav>
      </header>

      {realtime.status !== "online" && (
        <div className="offline-banner" role="status">
          {text.offline}{" "}
          <button type="button" onClick={() => void realtime.refresh()}>
            {text.retry}
          </button>
        </div>
      )}

      <section className="latest-card" aria-live="polite">
        <span>{text.latest}</span>
        <strong>{snapshot.latestNumber ?? "–"}</strong>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h1>{text.drawn}</h1>
          <div className="segmented">
            <button
              className={!ascending ? "active" : ""}
              type="button"
              onClick={() => {
                setAscending(false);
                localStorage.setItem("bingo.order", "draw");
              }}
            >
              {text.drawOrder}
            </button>
            <button
              className={ascending ? "active" : ""}
              type="button"
              onClick={() => {
                setAscending(true);
                localStorage.setItem("bingo.order", "ascending");
              }}
            >
              {text.ascending}
            </button>
          </div>
        </div>
        <div className="number-grid">
          {numbers.map((item) => (
            <div
              key={item.id}
              className={
                item.number === snapshot.latestNumber ? "number-chip latest" : "number-chip"
              }
            >
              {item.number}
            </div>
          ))}
        </div>
      </section>

      <section className="action-grid">
        <button
          type="button"
          className="primary-action"
          disabled={reachSent || !snapshot.flags.reachSubmissionEnabled}
          onClick={() => void handleReach()}
        >
          {reachSent ? text.reached : text.reach}
        </button>
        <a className="secondary-action" href="/prizes">
          🎁 {text.prizes}
        </a>
        {snapshot.survey.active && snapshot.flags.surveyEnabled && (
          <a
            className="secondary-action"
            href={snapshot.survey.url}
            target="_blank"
            rel="noreferrer"
          >
            📝 {text.survey}
          </a>
        )}
      </section>

      <section className="panel">
        <h2>{text.reactions}</h2>
        <div className="reaction-grid">
          {REACTION_NAMES.map((name) => (
            <button
              type="button"
              key={name}
              disabled={!snapshot.flags.reactionsEnabled || !reactions.connected}
              aria-label={name}
              onClick={() => {
                if (reactions.sendReaction(name)) setNotice(`${REACTION_EMOJI[name]} sent`);
              }}
            >
              {REACTION_EMOJI[name]}
            </button>
          ))}
        </div>
        {reactions.error && <p className="error-text">{reactions.error}</p>}
      </section>
      {notice && (
        <div className="toast" role="status" onAnimationEnd={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </main>
  );
}
