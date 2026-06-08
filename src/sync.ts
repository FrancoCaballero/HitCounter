import { invoke } from "@tauri-apps/api/core";
import { useRun } from "./store";

type SplitRow = {
  name: string;
  hits: number;
  timeMs: number;
  pbHits: number | null;
  pbTimeMs: number | null;
};

type Snapshot = {
  tsMs: number;
  title: string;
  isRunning: boolean;
  isFinished: boolean;
  totalHits: number;
  totalPbHits: number | null;
  totalPbTimeMs: number | null;
  runElapsedMs: number;
  activeIdx: number;
  splits: SplitRow[];
  activeSplit: SplitRow | null;
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
  const splits: SplitRow[] = s.splits.map((row, i) => ({
    name: row.name,
    hits: row.hits,
    timeMs:
      i === s.activeIdx
        ? row.timeMs + (s.isRunning && s.splitStartedAt ? now - s.splitStartedAt : 0)
        : row.timeMs,
    pbHits: row.pbHits,
    pbTimeMs: row.pbTimeMs,
  }));
  return {
    tsMs: Date.now(),
    title: s.title,
    isRunning: s.isRunning,
    isFinished: s.isFinished,
    totalHits: s.totalHits,
    totalPbHits: s.totalPbHits,
    totalPbTimeMs: s.totalPbTimeMs,
    runElapsedMs: runElapsed,
    activeIdx: s.activeIdx,
    splits,
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
  pushStyle(loadStyle());
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

export type OverlayStyle = {
  theme: string;
  accent: string;
  text: string;
  scale: number;
  noShadow: boolean;
  titleFont: string;
  tableRows: number;
  show: {
    title: boolean;
    totalHits: boolean;
    totalTimer: boolean;
    totalPb: boolean;
    activeSplit: boolean;
    colHits: boolean;
    colDelta: boolean;
    colTime: boolean;
    colPb: boolean;
    tableTotals: boolean;
  };
};

export const DEFAULT_STYLE: OverlayStyle = {
  theme: "default",
  accent: "#ffb454",
  text: "#ffffff",
  scale: 1,
  noShadow: false,
  titleFont: "",
  tableRows: 8,
  show: {
    title: true,
    totalHits: true,
    totalTimer: true,
    totalPb: true,
    activeSplit: true,
    colHits: true,
    colDelta: true,
    colTime: true,
    colPb: true,
    tableTotals: true,
  },
};

const STYLE_KEY = "hc.overlayStyle";

export function loadStyle(): OverlayStyle {
  try {
    const raw = localStorage.getItem(STYLE_KEY);
    if (!raw) return { ...DEFAULT_STYLE, show: { ...DEFAULT_STYLE.show } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STYLE,
      ...parsed,
      show: { ...DEFAULT_STYLE.show, ...(parsed.show || {}) },
    };
  } catch {
    return { ...DEFAULT_STYLE, show: { ...DEFAULT_STYLE.show } };
  }
}

export async function pushStyle(style: OverlayStyle): Promise<void> {
  try {
    localStorage.setItem(STYLE_KEY, JSON.stringify(style));
  } catch {}
  try {
    await invoke("push_style", { payload: JSON.stringify(style) });
  } catch {}
}
