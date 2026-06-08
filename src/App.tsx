import { useEffect, useState } from "react";
import { useRun, formatTime } from "./store";
import { HotkeySettings } from "./HotkeySettings";
import { HistoryPanel } from "./HistoryPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { OverlayPanel } from "./OverlayPanel";
import { BackupPanel } from "./BackupPanel";
import "./App.css";

function useTimerTick() {
  const isRunning = useRun((s) => s.isRunning);
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    let raf = 0;
    const loop = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isRunning]);
}

function useHotkeys() {
  const { addHit, undoHit, nextSplit, startRun, pauseRun, resumeRun, resetRun, isRunning, isFinished } =
    useRun();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case "Numpad1":
        case "KeyH":
          addHit();
          break;
        case "Numpad0":
        case "Backspace":
          undoHit();
          break;
        case "Numpad2":
        case "KeyN":
          nextSplit();
          break;
        case "Space":
          e.preventDefault();
          if (isFinished) resetRun();
          else if (!isRunning) {
            if (useRun.getState().runStartedAt === null && useRun.getState().runElapsedMs === 0) startRun();
            else resumeRun();
          } else pauseRun();
          break;
        case "KeyR":
          if (e.ctrlKey) resetRun();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addHit, undoHit, nextSplit, startRun, pauseRun, resumeRun, resetRun, isRunning, isFinished]);
}

function App() {
  useTimerTick();
  useHotkeys();

  const splits = useRun((s) => s.splits);
  const activeIdx = useRun((s) => s.activeIdx);
  const totalHits = useRun((s) => s.totalHits);
  const totalPbHits = useRun((s) => s.totalPbHits);
  const totalPbTimeMs = useRun((s) => s.totalPbTimeMs);
  const isRunning = useRun((s) => s.isRunning);
  const isFinished = useRun((s) => s.isFinished);
  const runElapsedMs = useRun((s) => s.runElapsedMs);
  const runStartedAt = useRun((s) => s.runStartedAt);
  const splitStartedAt = useRun((s) => s.splitStartedAt);

  const now = performance.now();
  const runMs =
    runElapsedMs + (isRunning && runStartedAt !== null ? now - runStartedAt : 0);
  const activeSplit = splits[activeIdx];
  const splitMs = activeSplit
    ? activeSplit.timeMs +
      (isRunning && splitStartedAt !== null ? now - splitStartedAt : 0)
    : 0;

  const [newSplit, setNewSplit] = useState("");
  const [showHk, setShowHk] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const store = useRun.getState();

  return (
    <main className="hc-root">
      <input
        className="hc-title-input"
        placeholder="Run title (e.g. Dark Souls SL1 No-Hit)"
        value={useRun((s) => s.title)}
        onChange={(e) => store.setTitle(e.currentTarget.value)}
      />

      <header className="hc-header">
        <div className="hc-timer">
          <div className="hc-time-main">{formatTime(runMs)}</div>
          <div className="hc-time-sub">
            PB: {totalPbTimeMs !== null ? formatTime(totalPbTimeMs) : "—"} · Best Hits:{" "}
            {totalPbHits ?? "—"}
          </div>
        </div>
        <div className="hc-hits">
          <div className="hc-hits-label">HITS</div>
          <div className="hc-hits-value">{totalHits}</div>
        </div>
      </header>

      <section className="hc-controls hc-controls-top">
        {!isRunning && !isFinished && store.runElapsedMs === 0 && (
          <button onClick={store.startRun}>Start (Space)</button>
        )}
        {!isRunning && !isFinished && store.runElapsedMs > 0 && (
          <button onClick={store.resumeRun}>Resume (Space)</button>
        )}
        {isRunning && <button onClick={store.pauseRun}>Pause (Space)</button>}
        <button onClick={store.addHit}>+Hit (H / Num1)</button>
        <button onClick={store.undoHit}>Undo (Backspace / Num0)</button>
        <button onClick={store.nextSplit} disabled={!isRunning}>
          Next Split (N / Num2)
        </button>
        <button onClick={store.finishRun} disabled={!isRunning}>
          Finish
        </button>
        <button onClick={store.resetRun}>Reset (Ctrl+R)</button>
        <button onClick={() => setShowOverlay(true)}>OBS Overlay</button>
        <button onClick={() => setShowHk(true)}>Hotkeys</button>
        <button onClick={() => setShowHist(true)}>History</button>
        <button onClick={() => setShowTpl(true)}>Templates</button>
        <button onClick={() => setShowBackup(true)}>Backup</button>
      </section>

      <section className="hc-add hc-add-top">
        <input
          placeholder="Add split name..."
          value={newSplit}
          onChange={(e) => setNewSplit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newSplit.trim()) {
              store.addSplit(newSplit.trim());
              setNewSplit("");
            }
          }}
        />
        <button
          onClick={() => {
            if (!newSplit.trim()) return;
            store.addSplit(newSplit.trim());
            setNewSplit("");
          }}
        >
          + Split
        </button>
      </section>

      <section className="hc-splits">
        {splits.map((sp, i) => {
          const active = i === activeIdx && isRunning;
          const hitsDelta =
            sp.pbHits !== null ? sp.hits - sp.pbHits : null;
          return (
            <div
              key={sp.id}
              className={`hc-split ${active ? "active" : ""} ${
                i < activeIdx ? "done" : ""
              }`}
            >
              <input
                className="hc-split-name"
                value={sp.name}
                onChange={(e) => store.renameSplit(sp.id, e.currentTarget.value)}
              />
              <div className="hc-split-stats">
                <span className="hc-stat">
                  <b>{i === activeIdx ? sp.hits : sp.hits}</b>
                  <small>
                    {sp.pbHits !== null ? `PB ${sp.pbHits}` : "—"}
                  </small>
                </span>
                <span
                  className={`hc-delta ${
                    hitsDelta === null
                      ? ""
                      : hitsDelta < 0
                      ? "good"
                      : hitsDelta > 0
                      ? "bad"
                      : ""
                  }`}
                >
                  {hitsDelta === null ? "" : hitsDelta > 0 ? `+${hitsDelta}` : hitsDelta}
                </span>
                <span className="hc-stat">
                  <b>
                    {formatTime(i === activeIdx && isRunning ? splitMs : sp.timeMs)}
                  </b>
                  <small>
                    {sp.pbTimeMs !== null ? formatTime(sp.pbTimeMs) : "—"}
                  </small>
                </span>
                <button
                  className="hc-x"
                  onClick={() => store.removeSplit(sp.id)}
                  title="Remove split"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {showHk && <HotkeySettings onClose={() => setShowHk(false)} />}
      {showHist && <HistoryPanel onClose={() => setShowHist(false)} />}
      {showTpl && <TemplatesPanel onClose={() => setShowTpl(false)} />}
      {showOverlay && <OverlayPanel onClose={() => setShowOverlay(false)} />}
      {showBackup && <BackupPanel onClose={() => setShowBackup(false)} />}
    </main>
  );
}

export default App;
