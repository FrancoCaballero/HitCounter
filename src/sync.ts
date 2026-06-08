import { invoke } from "@tauri-apps/api/core";
import { useRun } from "./store";
import { useMultirun } from "./multirun";

type SplitRow = {
  name: string;
  hits: number;
  timeMs: number;
  pbHits: number | null;
  pbTimeMs: number | null;
};

type MultirunSubInfo = { name: string; completed: boolean; active: boolean };
type MultirunInfo = { title: string; runs: MultirunSubInfo[] } | null;

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
  multirun: MultirunInfo;
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
  const mr = useMultirun.getState();
  const activeM = mr.multiruns.find((m) => m.id === mr.activeMultirunId) || null;
  const multirun: MultirunInfo = activeM
    ? {
        title: activeM.title,
        runs: activeM.runs.map((r) => ({
          name: r.name,
          completed: r.completed,
          active: r.id === mr.activeSubrunId,
        })),
      }
    : null;
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
    multirun,
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
  useMultirun.subscribe(() => push());
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

export type BackgroundKind = "none" | "preset" | "color" | "image";
export type BackgroundFit = "cover" | "contain" | "tile";

export type Background = {
  kind: BackgroundKind;
  value: string;
  fit: BackgroundFit;
};

export type BgPreset = { id: string; name: string; css: string };

export const BG_PRESETS: BgPreset[] = [
  { id: "midnight", name: "Midnight", css: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  { id: "sunset", name: "Sunset", css: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)" },
  { id: "forest", name: "Forest", css: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
  { id: "neon", name: "Neon", css: "linear-gradient(135deg, #ff00cc 0%, #333399 100%)" },
  { id: "mono", name: "Mono", css: "linear-gradient(135deg, #232526 0%, #414345 100%)" },
  { id: "ember", name: "Ember", css: "radial-gradient(circle at 30% 30%, #ff512f 0%, #dd2476 100%)" },
  { id: "ocean", name: "Ocean", css: "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)" },
  { id: "blood", name: "Blood", css: "linear-gradient(135deg, #200122 0%, #6f0000 100%)" },
];

export type OverlayStyle = {
  theme: string;
  accent: string;
  text: string;
  scale: number;
  noShadow: boolean;
  titleFont: string;
  tableRows: number;
  background: Background;
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
    multirun: boolean;
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
  background: { kind: "none", value: "", fit: "cover" },
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
    multirun: true,
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
      background: { ...DEFAULT_STYLE.background, ...(parsed.background || {}) },
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
