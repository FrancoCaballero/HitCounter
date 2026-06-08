import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useRun, Split } from "./store";

export type RunEntry = {
  id: string;
  finishedAt: number;
  totalHits: number;
  totalTimeMs: number;
  splits: {
    name: string;
    hits: number;
    timeMs: number;
  }[];
};

type HistoryStore = {
  runs: RunEntry[];
  add: (entry: RunEntry) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useHistory = create<HistoryStore>()(
  persist(
    (set) => ({
      runs: [],
      add: (entry) => set((s) => ({ runs: [entry, ...s.runs].slice(0, 500) })),
      remove: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
      clear: () => set({ runs: [] }),
    }),
    { name: "hitcounter-history" }
  )
);

function snapshotFromSplits(splits: Split[], totalHits: number, totalTimeMs: number): RunEntry {
  return {
    id: crypto.randomUUID(),
    finishedAt: Date.now(),
    totalHits,
    totalTimeMs,
    splits: splits.map((sp) => ({
      name: sp.name,
      hits: sp.hits,
      timeMs: sp.timeMs,
    })),
  };
}

export function startHistory() {
  let prevFinished = useRun.getState().isFinished;
  useRun.subscribe((state) => {
    if (state.isFinished && !prevFinished) {
      const entry = snapshotFromSplits(
        state.splits,
        state.totalHits,
        state.runElapsedMs
      );
      useHistory.getState().add(entry);
    }
    prevFinished = state.isFinished;
  });
}

export function exportHistoryJson(): string {
  return JSON.stringify(useHistory.getState().runs, null, 2);
}

export function computeStats(runs: RunEntry[]) {
  if (runs.length === 0) {
    return {
      count: 0,
      bestHits: null as number | null,
      worstHits: null as number | null,
      avgHits: null as number | null,
      bestTimeMs: null as number | null,
      avgTimeMs: null as number | null,
    };
  }
  const hits = runs.map((r) => r.totalHits);
  const times = runs.map((r) => r.totalTimeMs);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return {
    count: runs.length,
    bestHits: Math.min(...hits),
    worstHits: Math.max(...hits),
    avgHits: sum(hits) / hits.length,
    bestTimeMs: Math.min(...times),
    avgTimeMs: sum(times) / times.length,
  };
}
