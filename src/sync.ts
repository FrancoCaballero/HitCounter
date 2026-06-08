import { invoke } from "@tauri-apps/api/core";
import { useRun } from "./store";

type Snapshot = {
  tsMs: number;
  title: string;
  isRunning: boolean;
  isFinished: boolean;
  totalHits: number;
  totalPbHits: number | null;
  totalPbTimeMs: number | null;
  runElapsedMs: number;
  activeSplit: {
    name: string;
    hits: number;
    timeMs: number;
    pbHits: number | null;
    pbTimeMs: number | null;
  } | null;
};

function snapshot(): Snapshot {
  const s = useRun.getState();
  const sp = s.splits[s.activeIdx];
  const now = performance.now();
  const runElapsed =
    s.runElapsedMs +
    (s.isRunning && s.runStartedAt ? now - s.runStartedAt : 0);
  const splitTime = sp
    ? sp.timeMs +
      (s.isRunning && s.splitStartedAt ? now - s.splitStartedAt : 0)
    : 0;
  return {
    tsMs: Date.now(),
    title: s.title,
    isRunning: s.isRunning,
    isFinished: s.isFinished,
    totalHits: s.totalHits,
    totalPbHits: s.totalPbHits,
    totalPbTimeMs: s.totalPbTimeMs,
    runElapsedMs: runElapsed,
    activeSplit: sp
      ? {
          name: sp.name,
          hits: sp.hits,
          timeMs: splitTime,
          pbHits: sp.pbHits,
          pbTimeMs: sp.pbTimeMs,
        }
      : null,
  };
}

let lastSent = "";
async function push() {
  const payload = JSON.stringify(snapshot());
  if (payload === lastSent) return;
  lastSent = payload;
  try {
    await invoke("push_state", { payload });
  } catch {}
}

export function startSync() {
  push();
  useRun.subscribe(() => push());
  // Frequent push while running to keep timer fresh on (re)connect.
  setInterval(() => {
    if (useRun.getState().isRunning) {
      lastSent = "";
      push();
    }
  }, 500);
}

export async function getOverlayUrl(): Promise<string> {
  try {
    return await invoke<string>("overlay_url");
  } catch {
    return "http://localhost:17800/";
  }
}
