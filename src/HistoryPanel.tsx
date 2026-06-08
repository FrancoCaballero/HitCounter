import { useMemo, useState } from "react";
import { useHistory, computeStats, exportHistoryJson, RunEntry } from "./history";
import { formatTime } from "./store";

function fmtDate(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const { runs, remove, clear } = useHistory();
  const stats = useMemo(() => computeStats(runs), [runs]);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function copyJson() {
    await navigator.clipboard.writeText(exportHistoryJson());
  }

  function downloadJson() {
    const blob = new Blob([exportHistoryJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hitcounter-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div className="hc-modal hc-modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="hc-modal-head">
          <h3>Run History</h3>
          <button className="hc-x" onClick={onClose}>×</button>
        </header>

        <section className="hc-stats">
          <Stat label="Runs" value={stats.count} />
          <Stat label="Best Hits" value={stats.bestHits ?? "—"} />
          <Stat label="Avg Hits" value={stats.avgHits !== null ? stats.avgHits.toFixed(1) : "—"} />
          <Stat label="Worst Hits" value={stats.worstHits ?? "—"} />
          <Stat label="Best Time" value={stats.bestTimeMs !== null ? formatTime(stats.bestTimeMs) : "—"} />
          <Stat label="Avg Time" value={stats.avgTimeMs !== null ? formatTime(stats.avgTimeMs) : "—"} />
        </section>

        <section className="hc-runlist">
          {runs.length === 0 ? (
            <div className="hc-empty">No runs yet. Finish a run to record it.</div>
          ) : (
            runs.map((r) => (
              <RunRow
                key={r.id}
                run={r}
                expanded={expanded === r.id}
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                onRemove={() => remove(r.id)}
                bestHits={stats.bestHits}
                bestTime={stats.bestTimeMs}
              />
            ))
          )}
        </section>

        <div className="hc-modal-foot">
          <button onClick={copyJson} disabled={runs.length === 0}>Copy JSON</button>
          <button onClick={downloadJson} disabled={runs.length === 0}>Download JSON</button>
          <button
            onClick={() => {
              if (confirm("Delete ALL history? Cannot undo.")) clear();
            }}
            disabled={runs.length === 0}
          >
            Clear all
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="hc-stat-card">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

function RunRow({
  run,
  expanded,
  onToggle,
  onRemove,
  bestHits,
  bestTime,
}: {
  run: RunEntry;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  bestHits: number | null;
  bestTime: number | null;
}) {
  const isBestHits = bestHits !== null && run.totalHits === bestHits;
  const isBestTime = bestTime !== null && run.totalTimeMs === bestTime;
  return (
    <div className="hc-run">
      <div className="hc-run-head" onClick={onToggle}>
        <span className="hc-run-date">{fmtDate(run.finishedAt)}</span>
        <span className={`hc-run-hits ${isBestHits ? "best" : ""}`}>
          {run.totalHits} hits {isBestHits && "★"}
        </span>
        <span className={`hc-run-time ${isBestTime ? "best" : ""}`}>
          {formatTime(run.totalTimeMs)} {isBestTime && "★"}
        </span>
        <button
          className="hc-x"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      </div>
      {expanded && (
        <div className="hc-run-splits">
          {run.splits.map((sp, i) => (
            <div key={i} className="hc-run-split">
              <span>{sp.name}</span>
              <span>{sp.hits} hits</span>
              <span>{formatTime(sp.timeMs)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
