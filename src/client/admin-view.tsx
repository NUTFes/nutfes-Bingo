import { useEffect, useState, type FormEvent } from "react";

import type { AdminCommand, Prize } from "../shared/protocol";
import { deletePrize, savePrize, sendAdminCommand, setLocalAdminToken, verifyAdmin } from "./api";
import { useBingoSocket } from "./use-bingo-socket";

export function AdminView() {
  const realtime = useBingoSocket();
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState("");
  const [surveyUrl, setSurveyUrl] = useState("");

  const authenticate = async () => {
    try {
      await verifyAdmin();
      setAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      setAuthenticated(false);
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    }
  };

  useEffect(() => {
    void authenticate();
  }, []);
  useEffect(() => {
    if (realtime.snapshot) setSurveyUrl(realtime.snapshot.survey.url);
  }, [realtime.snapshot?.survey.url]);

  const command = async (value: AdminCommand, success: string) => {
    setBusy(true);
    try {
      realtime.replaceSnapshot(await sendAdminCommand(value));
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  if (!authenticated) {
    return (
      <main className="center-page admin-login">
        <h1>Administrator</h1>
        <p>
          Production access is enforced by Cloudflare Access. For local development, enter
          DEV_ADMIN_TOKEN.
        </p>
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Local admin token"
        />
        <button
          type="button"
          onClick={() => {
            setLocalAdminToken(token);
            void authenticate();
          }}
        >
          Authenticate
        </button>
        {authError && <p className="error-text">{authError}</p>}
      </main>
    );
  }

  const snapshot = realtime.snapshot;
  if (!snapshot)
    return (
      <main className="center-page">
        <div className="spinner" aria-label="Loading" />
      </main>
    );

  const submitPrize = async (event: FormEvent<HTMLFormElement>, id?: number) => {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      realtime.replaceSnapshot(await savePrize(form, id));
      setNotice(id ? "Prize updated" : "Prize created");
      if (!id) event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Prize operation failed");
    } finally {
      setBusy(false);
    }
  };

  const reorderPrize = (prize: Prize, direction: -1 | 1) => {
    const ids = snapshot.prizes.map((item) => item.id);
    const index = ids.indexOf(prize.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target]!, next[index]!];
    void command({ type: "prize.reorder", ids: next }, "Prize order updated");
  };

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <strong>Bingo Control</strong>
          <span>
            {snapshot.eventId} · version {snapshot.version}
          </span>
        </div>
        <div>
          <span className={realtime.status === "online" ? "status-pill online" : "status-pill"}>
            {realtime.status}
          </span>
          <a href="/screen" target="_blank">
            Open venue screen
          </a>
        </div>
      </header>
      {notice && (
        <div className="admin-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <div className="admin-grid">
        <section className="admin-card wide">
          <h2>Drawn numbers</h2>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const number = Number(newNumber);
              void command({ type: "number.add", number }, `Added ${number}`);
              setNewNumber("");
            }}
          >
            <input
              type="number"
              min="1"
              max="99"
              required
              value={newNumber}
              onChange={(event) => setNewNumber(event.target.value)}
            />
            <button disabled={busy} type="submit">
              Add number
            </button>
          </form>
          <div className="admin-number-list">
            {snapshot.numbers.toReversed().map((item) => (
              <form
                className="number-edit"
                key={item.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void command(
                    { type: "number.update", id: item.id, number: Number(form.get("number")) },
                    "Number updated",
                  );
                }}
              >
                <input
                  name="number"
                  type="number"
                  min="1"
                  max="99"
                  defaultValue={item.number}
                  aria-label={`Number ${item.number}`}
                />
                <button disabled={busy} type="submit">
                  Update
                </button>
                <button
                  disabled={busy}
                  className="danger"
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete ${item.number}?`))
                      void command({ type: "number.delete", id: item.id }, "Number deleted");
                  }}
                >
                  Delete
                </button>
              </form>
            ))}
          </div>
          <button
            className="danger"
            disabled={busy || snapshot.numbers.length === 0}
            type="button"
            onClick={() => {
              if (confirm("Delete every drawn number? This cannot be undone."))
                void command({ type: "numbers.reset" }, "All numbers reset");
            }}
          >
            Reset all numbers
          </button>
        </section>

        <section className="admin-card">
          <h2>Reach count</h2>
          <div className="metric">{snapshot.reachCount}</div>
          <div className="button-row">
            <button
              disabled={busy}
              type="button"
              onClick={() => void command({ type: "reach.decrement" }, "Reach decreased")}
            >
              −
            </button>
            <button
              disabled={busy}
              type="button"
              onClick={() => void command({ type: "reach.increment" }, "Reach increased")}
            >
              ＋
            </button>
          </div>
          <button
            className="danger"
            disabled={busy}
            type="button"
            onClick={() => {
              if (confirm("Reset reach count and participant submissions?"))
                void command({ type: "reach.reset" }, "Reach reset");
            }}
          >
            Reset reach
          </button>
        </section>

        <section className="admin-card">
          <h2>Survey</h2>
          <label>
            HTTPS URL
            <input
              type="url"
              value={surveyUrl}
              onChange={(event) => setSurveyUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
          <div className="button-row">
            <button
              disabled={busy}
              type="button"
              onClick={() =>
                void command(
                  { type: "survey.update", active: true, url: surveyUrl },
                  "Survey published",
                )
              }
            >
              Publish
            </button>
            <button
              disabled={busy}
              type="button"
              onClick={() =>
                void command(
                  { type: "survey.update", active: false, url: surveyUrl },
                  "Survey stopped",
                )
              }
            >
              Stop
            </button>
          </div>
        </section>

        <section className="admin-card wide">
          <h2>Feature degradation controls</h2>
          <div className="flag-grid">
            {Object.entries(snapshot.flags).map(([key, enabled]) => (
              <label key={key} className="flag-control">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={busy}
                  onChange={(event) =>
                    void command(
                      { type: "flags.update", flags: { [key]: event.target.checked } },
                      `${key} updated`,
                    )
                  }
                />
                <span>{key}</span>
              </label>
            ))}
          </div>
          <p className="hint">
            Disable reactions first under pressure. readOnlyMode preserves the last persisted state
            while rejecting writes.
          </p>
        </section>

        <section className="admin-card full">
          <h2>Prizes</h2>
          <form className="prize-edit create" onSubmit={(event) => void submitPrize(event)}>
            <input name="nameJa" required maxLength={120} placeholder="Japanese name" />
            <input name="nameEn" required maxLength={120} placeholder="English name" />
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" />
            <input name="isWon" type="hidden" value="false" />
            <button disabled={busy} type="submit">
              Create prize
            </button>
          </form>
          <div className="admin-prizes">
            {snapshot.prizes.map((prize, index) => (
              <form
                className="prize-edit"
                key={prize.id}
                onSubmit={(event) => void submitPrize(event, prize.id)}
              >
                {prize.imageUrl ? (
                  <img src={prize.imageUrl} alt="" />
                ) : (
                  <div className="tiny-placeholder">🎁</div>
                )}
                <input name="nameJa" required maxLength={120} defaultValue={prize.nameJa} />
                <input name="nameEn" required maxLength={120} defaultValue={prize.nameEn} />
                <input name="image" type="file" accept="image/jpeg,image/png,image/webp" />
                <input name="isWon" type="hidden" value={String(prize.isWon)} />
                <button disabled={busy} type="submit">
                  Save
                </button>
                <button
                  disabled={busy}
                  type="button"
                  onClick={() =>
                    void command(
                      { type: "prize.toggleWon", id: prize.id, isWon: !prize.isWon },
                      "Prize status updated",
                    )
                  }
                >
                  {prize.isWon ? "Mark available" : "Mark won"}
                </button>
                <button
                  disabled={busy || index === 0}
                  type="button"
                  onClick={() => reorderPrize(prize, -1)}
                >
                  ↑
                </button>
                <button
                  disabled={busy || index === snapshot.prizes.length - 1}
                  type="button"
                  onClick={() => reorderPrize(prize, 1)}
                >
                  ↓
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete ${prize.nameJa} and its image?`)) {
                      setBusy(true);
                      void deletePrize(prize.id)
                        .then(realtime.replaceSnapshot)
                        .catch((error: unknown) =>
                          setNotice(error instanceof Error ? error.message : "Delete failed"),
                        )
                        .finally(() => setBusy(false));
                    }
                  }}
                >
                  Delete
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="admin-card full danger-zone">
          <h2>Event initialization</h2>
          <p>Deletes numbers, reaches, prizes, prize images, and survey state.</p>
          <button
            className="danger"
            disabled={busy}
            type="button"
            onClick={() => {
              if (prompt("Type RESET to initialize this event") === "RESET")
                void command({ type: "event.initialize" }, "Event initialized");
            }}
          >
            Initialize event
          </button>
        </section>

        <section className="admin-card full">
          <details>
            <summary>Current state</summary>
            <pre>{JSON.stringify(snapshot, null, 2)}</pre>
          </details>
        </section>
      </div>
    </main>
  );
}
