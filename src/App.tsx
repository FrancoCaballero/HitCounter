import { useEffect, useRef, useState } from "react";
import { useRun, formatTime } from "./store";
import { HotkeySettings } from "./HotkeySettings";
import { HistoryPanel } from "./HistoryPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { OverlayPanel } from "./OverlayPanel";
import { BackupPanel } from "./BackupPanel";
import { MultirunPanel } from "./MultirunPanel";
import { useMultirun } from "./multirun";
import { useTemplates } from "./templates";
import { ConfirmHost } from "./Confirm";
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
  const { addHit, undoHit, nextSplit, startRun, pauseRun, resumeRun, resetRun, isRunning, isFinished, mode } =
    useRun();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const hitsMode = mode === "hits";
      switch (e.code) {
        case "Numpad1":
        case "KeyH":
          if (hitsMode) addHit();
          break;
        case "Numpad0":
        case "Backspace":
          if (hitsMode) undoHit();
          break;
        case "Numpad2":
        case "KeyN":
          if (hitsMode) nextSplit();
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
  }, [addHit, undoHit, nextSplit, startRun, pauseRun, resumeRun, resetRun, isRunning, isFinished, mode]);
}

function useFlushOnExit() {
  useEffect(() => {
    const flush = () => {
      if (useRun.getState().isRunning) useRun.getState().pauseRun();
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);
}

function App() {
  useTimerTick();
  useHotkeys();
  useFlushOnExit();

  const splits = useRun((s) => s.splits);
  const activeIdx = useRun((s) => s.activeIdx);
  const totalHits = useRun((s) => s.totalHits);
  const totalPbHits = useRun((s) => s.totalPbHits);
  const totalPbTimeMs = useRun((s) => s.totalPbTimeMs);
  const isRunning = useRun((s) => s.isRunning);
  const isFinished = useRun((s) => s.isFinished);
  const mode = useRun((s) => s.mode);
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
  const [showMulti, setShowMulti] = useState(false);
  const activeMultirunId = useMultirun((s) => s.activeMultirunId);
  const activeSubrunId = useMultirun((s) => s.activeSubrunId);
  const multiruns = useMultirun((s) => s.multiruns);
  const activeMultirun = multiruns.find((m) => m.id === activeMultirunId) || null;
  const activeSubrun = activeMultirun?.runs.find((r) => r.id === activeSubrunId) || null;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const store = useRun.getState();
  const activeTemplateId = useRun((s) => s.activeTemplateId);
  const linkedTemplate = useTemplates((s) =>
    activeTemplateId ? s.customs.find((t) => t.id === activeTemplateId) ?? null : null
  );

  return (
    <main className="hc-root">
      <input
        className="hc-title-input"
        placeholder="Run title (e.g. Dark Souls SL1 No-Hit)"
        value={useRun((s) => s.title)}
        onChange={(e) => store.setTitle(e.currentTarget.value)}
      />
      {linkedTemplate && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--muted)",
            padding: "0 4px",
          }}
        >
          <span>
            Editing template: <b style={{ color: "var(--accent)" }}>{linkedTemplate.name}</b> · changes auto-save
          </span>
          <button
            onClick={() => store.setActiveTemplateId(null)}
            style={{ padding: "2px 8px", fontSize: 11 }}
            title="Stop syncing edits to this template"
          >
            Unlink
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          padding: "0 4px",
        }}
      >
        <button
          onClick={() => store.setMode(mode === "hits" ? "checklist" : "hits")}
          title="Toggle between hits and no-death checklist mode"
          style={{
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 600,
            background: mode === "checklist" ? "var(--good, #4ade80)" : "var(--panel-2)",
            color: mode === "checklist" ? "#0a0a0a" : "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 6,
          }}
        >
          Mode: {mode === "hits" ? "Hits" : "No-Death Checklist"}
        </button>
      </div>

      <header className="hc-header">
        <div className="hc-timer">
          <div className="hc-time-main">{formatTime(runMs)}</div>
          <div className="hc-time-sub">
            PB: {totalPbHits ?? "—"} · PB time:{" "}
            {totalPbTimeMs !== null ? formatTime(totalPbTimeMs) : "—"}
          </div>
        </div>
        <div className="hc-hits">
          <div className="hc-hits-label">{mode === "checklist" ? "DONE" : "HITS"}</div>
          <div className="hc-hits-value">
            {mode === "checklist"
              ? `${splits.filter((sp) => sp.done).length}/${splits.length}`
              : totalHits}
          </div>
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
        {mode === "hits" && (
          <>
            <button onClick={store.addHit}>+Hit (H / Num1)</button>
            <button onClick={store.undoHit}>Undo (Backspace / Num0)</button>
            <button onClick={store.nextSplit} disabled={!isRunning}>
              Next Split (N / Num2)
            </button>
          </>
        )}
        <button onClick={store.finishRun} disabled={!isRunning}>
          Finish
        </button>
        <button onClick={store.resetRun}>Reset (Ctrl+R)</button>
        <button onClick={() => setShowOverlay(true)}>OBS Overlay</button>
        <button onClick={() => setShowHk(true)}>Hotkeys</button>
        <button onClick={() => setShowHist(true)}>History</button>
        <button onClick={() => setShowTpl(true)}>Templates</button>
        <button onClick={() => setShowBackup(true)}>Backup</button>
        <button onClick={() => setShowMulti(true)}>
          Multirun{activeMultirun ? " ●" : ""}
        </button>
      </section>

      {activeMultirun && (
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 0.3,
                textAlign: "center",
              }}
            >
              {activeMultirun.title}
            </div>
            <button
              onClick={() => useMultirun.getState().clearActive()}
              title="Deactivate multirun"
              style={{ position: "absolute", right: 0 }}
            >
              Deactivate
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {activeMultirun.runs.map((r) => {
              const isActive = r.id === activeSubrun?.id;
              const done = r.completed;
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: isActive
                      ? "2px solid var(--accent)"
                      : done
                      ? "1px solid var(--good)"
                      : "1px solid var(--border)",
                    background: done
                      ? "rgba(74, 222, 128, 0.15)"
                      : "var(--panel-2)",
                    color: done ? "var(--good)" : "var(--muted)",
                    fontWeight: done ? 700 : 500,
                    opacity: done ? 1 : 0.7,
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() =>
                      useMultirun
                        .getState()
                        .toggleSubrunCompleted(activeMultirun.id, r.id)
                    }
                    style={{ cursor: "pointer", margin: 0 }}
                    title="Mark complete"
                  />
                  <span
                    onClick={() =>
                      useMultirun
                        .getState()
                        .selectSubrun(activeMultirun.id, r.id)
                    }
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Load this run"
                  >
                    {r.name}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
              draggable
              onDragStart={(e) => {
                dragIdRef.current = sp.id;
                setDragId(sp.id);
                e.dataTransfer.effectAllowed = "move";
                try { e.dataTransfer.setData("text/plain", sp.id); } catch {}
              }}
              onDragEnter={(e) => {
                if (!dragIdRef.current || dragIdRef.current === sp.id) return;
                e.preventDefault();
                setDragOverId(sp.id);
              }}
              onDragOver={(e) => {
                if (!dragIdRef.current || dragIdRef.current === sp.id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (dragOverId === sp.id) setDragOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIdRef.current || e.dataTransfer.getData("text/plain");
                if (from && from !== sp.id) store.reorderSplits(from, sp.id);
                dragIdRef.current = null;
                setDragId(null);
                setDragOverId(null);
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
                setDragId(null);
                setDragOverId(null);
              }}
              className={`hc-split ${active ? "active" : ""} ${
                (mode === "checklist" ? sp.done : i < activeIdx) ? "done" : ""
              } ${dragId === sp.id ? "dragging" : ""} ${
                dragOverId === sp.id ? "drag-over" : ""
              }`}
            >
              <span className="hc-drag-handle" title="Drag to reorder">⋮⋮</span>
              <input
                className="hc-split-name"
                draggable={false}
                value={sp.name}
                onChange={(e) => store.renameSplit(sp.id, e.currentTarget.value)}
              />
              <div className="hc-split-stats">
                {mode === "hits" && (
                  <>
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
                  </>
                )}
                <span className="hc-stat">
                  <b>
                    {mode === "checklist"
                      ? sp.completedAtMs != null
                        ? formatTime(sp.completedAtMs)
                        : "—"
                      : formatTime(i === activeIdx && isRunning ? splitMs : sp.timeMs)}
                  </b>
                  <small>
                    {sp.pbTimeMs !== null ? formatTime(sp.pbTimeMs) : "—"}
                  </small>
                </span>
                <div className="hc-split-move">
                  <button
                    className="hc-move-btn"
                    onClick={() => store.moveSplit(sp.id, -1)}
                    disabled={i === 0}
                    title="Move up"
                  >▲</button>
                  <button
                    className="hc-move-btn"
                    onClick={() => store.moveSplit(sp.id, 1)}
                    disabled={i === splits.length - 1}
                    title="Move down"
                  >▼</button>
                </div>
                {mode === "checklist" ? (
                  <input
                    type="checkbox"
                    checked={!!sp.done}
                    onChange={() => store.toggleSplitDone(sp.id)}
                    title="Mark complete (any order)"
                    style={{
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      accentColor: "var(--good, #4ade80)",
                    }}
                  />
                ) : (
                  (() => {
                    const isCurrent = i === activeIdx && isRunning;
                    const isDone = !!sp.done;
                    const mark = isDone ? "✓" : isCurrent ? "▶" : "○";
                    const color = isDone
                      ? "#d4af37"
                      : isCurrent
                      ? "var(--accent)"
                      : "rgba(255,255,255,0.35)";
                    return (
                      <button
                        onClick={() => store.jumpToSplit(sp.id)}
                        title="Jump to this split (marks previous as done)"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 800,
                          fontSize: 18,
                          color,
                          padding: "4px 8px",
                          userSelect: "none",
                        }}
                      >
                        {mark}
                      </button>
                    );
                  })()
                )}
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
      {showMulti && <MultirunPanel onClose={() => setShowMulti(false)} />}
      <ConfirmHost />
    </main>
  );
}

export default App;
