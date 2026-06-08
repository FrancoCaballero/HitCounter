import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Split = {
  id: string;
  name: string;
  hits: number;
  timeMs: number;
  pbHits: number | null;
  pbTimeMs: number | null;
  done?: boolean;
};

type RunState = {
  title: string;
  splits: Split[];
  activeIdx: number;
  totalHits: number;
  totalPbHits: number | null;
  totalPbTimeMs: number | null;
  runStartedAt: number | null;
  runElapsedMs: number;
  splitStartedAt: number | null;
  isRunning: boolean;
  isFinished: boolean;
  activeTemplateId: string | null;

  startRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  resetRun: () => void;
  addHit: () => void;
  undoHit: () => void;
  nextSplit: () => void;
  finishRun: () => void;
  addSplit: (name: string) => void;
  renameSplit: (id: string, name: string) => void;
  removeSplit: (id: string) => void;
  moveSplit: (id: string, dir: -1 | 1) => void;
  reorderSplits: (fromId: string, toId: string) => void;
  setSplits: (splits: Split[]) => void;
  setTitle: (title: string) => void;
  toggleSplitDone: (id: string) => void;
  jumpToSplit: (id: string) => void;
  setActiveTemplateId: (id: string | null) => void;
};

const blankSplit = (name: string): Split => ({
  id: crypto.randomUUID(),
  name,
  hits: 0,
  timeMs: 0,
  pbHits: null,
  pbTimeMs: null,
});

export const useRun = create<RunState>()(
  persist(
    (set, get) => ({
      title: "",
      splits: [blankSplit("Split 1")],
      activeIdx: 0,
      totalHits: 0,
      totalPbHits: null,
      totalPbTimeMs: null,
      runStartedAt: null,
      runElapsedMs: 0,
      splitStartedAt: null,
      isRunning: false,
      isFinished: false,
      activeTemplateId: null,

      startRun: () => {
        const now = performance.now();
        set((s) => ({
          splits: s.splits.map((sp) => ({
            ...sp,
            hits: 0,
            timeMs: 0,
            done: false,
          })),
          activeIdx: 0,
          totalHits: 0,
          runStartedAt: now,
          splitStartedAt: now,
          runElapsedMs: 0,
          isRunning: true,
          isFinished: false,
        }));
      },

      pauseRun: () => {
        const s = get();
        if (!s.isRunning) return;
        const now = performance.now();
        const elapsed = now - (s.runStartedAt ?? now);
        const splitElapsed = now - (s.splitStartedAt ?? now);
        set({
          runElapsedMs: s.runElapsedMs + elapsed,
          splits: s.splits.map((sp, i) =>
            i === s.activeIdx ? { ...sp, timeMs: sp.timeMs + splitElapsed } : sp
          ),
          runStartedAt: null,
          splitStartedAt: null,
          isRunning: false,
        });
      },

      resumeRun: () => {
        if (get().isRunning || get().isFinished) return;
        const now = performance.now();
        set({ runStartedAt: now, splitStartedAt: now, isRunning: true });
      },

      resetRun: () => {
        set((s) => ({
          splits: s.splits.map((sp) => ({ ...sp, hits: 0, timeMs: 0, done: false })),
          activeIdx: 0,
          totalHits: 0,
          runStartedAt: null,
          splitStartedAt: null,
          runElapsedMs: 0,
          isRunning: false,
          isFinished: false,
        }));
      },

      addHit: () => {
        set((s) => ({
          totalHits: s.totalHits + 1,
          splits: s.splits.map((sp, i) =>
            i === s.activeIdx ? { ...sp, hits: sp.hits + 1 } : sp
          ),
        }));
      },

      undoHit: () => {
        set((s) => {
          const sp = s.splits[s.activeIdx];
          if (!sp || sp.hits <= 0) return s;
          return {
            ...s,
            totalHits: Math.max(0, s.totalHits - 1),
            splits: s.splits.map((x, i) =>
              i === s.activeIdx ? { ...x, hits: x.hits - 1 } : x
            ),
          };
        });
      },

      nextSplit: () => {
        const s = get();
        if (!s.isRunning) return;
        const now = performance.now();
        const splitElapsed = now - (s.splitStartedAt ?? now);
        const splits = s.splits.map((sp, i) =>
          i === s.activeIdx
            ? { ...sp, timeMs: sp.timeMs + splitElapsed, done: true }
            : sp
        );
        if (s.activeIdx >= s.splits.length - 1) {
          get().finishRun();
          return;
        }
        set({
          splits,
          activeIdx: s.activeIdx + 1,
          splitStartedAt: now,
        });
      },

      finishRun: () => {
        const s = get();
        const now = performance.now();
        const elapsed = s.runStartedAt ? now - s.runStartedAt : 0;
        const splitElapsed = s.splitStartedAt ? now - s.splitStartedAt : 0;
        const splits = s.splits.map((sp, i) =>
          i === s.activeIdx ? { ...sp, timeMs: sp.timeMs + splitElapsed } : sp
        );
        const totalTime = s.runElapsedMs + elapsed;

        const updatedSplits = splits.map((sp) => {
          const newPbHits =
            sp.pbHits === null || sp.hits < sp.pbHits ? sp.hits : sp.pbHits;
          const newPbTime =
            sp.pbTimeMs === null || sp.timeMs < sp.pbTimeMs
              ? sp.timeMs
              : sp.pbTimeMs;
          return { ...sp, pbHits: newPbHits, pbTimeMs: newPbTime, done: true };
        });

        const newTotalPbHits =
          s.totalPbHits === null || s.totalHits < s.totalPbHits
            ? s.totalHits
            : s.totalPbHits;
        const newTotalPbTime =
          s.totalPbTimeMs === null || totalTime < s.totalPbTimeMs
            ? totalTime
            : s.totalPbTimeMs;

        set({
          splits: updatedSplits,
          runElapsedMs: totalTime,
          runStartedAt: null,
          splitStartedAt: null,
          isRunning: false,
          isFinished: true,
          totalPbHits: newTotalPbHits,
          totalPbTimeMs: newTotalPbTime,
        });
      },

      addSplit: (name) =>
        set((s) => ({ splits: [...s.splits, blankSplit(name || `Split ${s.splits.length + 1}`)] })),

      renameSplit: (id, name) =>
        set((s) => ({
          splits: s.splits.map((sp) => (sp.id === id ? { ...sp, name } : sp)),
        })),

      removeSplit: (id) =>
        set((s) => {
          const splits = s.splits.filter((sp) => sp.id !== id);
          return {
            splits: splits.length ? splits : [blankSplit("Split 1")],
            activeIdx: Math.min(s.activeIdx, Math.max(0, splits.length - 1)),
          };
        }),

      moveSplit: (id, dir) =>
        set((s) => {
          const idx = s.splits.findIndex((sp) => sp.id === id);
          if (idx < 0) return s;
          const target = idx + dir;
          if (target < 0 || target >= s.splits.length) return s;
          const splits = s.splits.slice();
          [splits[idx], splits[target]] = [splits[target], splits[idx]];
          let activeIdx = s.activeIdx;
          if (activeIdx === idx) activeIdx = target;
          else if (activeIdx === target) activeIdx = idx;
          return { splits, activeIdx };
        }),

      reorderSplits: (fromId, toId) =>
        set((s) => {
          if (fromId === toId) return s;
          const from = s.splits.findIndex((sp) => sp.id === fromId);
          const to = s.splits.findIndex((sp) => sp.id === toId);
          if (from < 0 || to < 0) return s;
          const splits = s.splits.slice();
          const [moved] = splits.splice(from, 1);
          splits.splice(to, 0, moved);
          let activeIdx = s.activeIdx;
          const activeId = s.splits[s.activeIdx]?.id;
          if (activeId) {
            const newActive = splits.findIndex((sp) => sp.id === activeId);
            if (newActive >= 0) activeIdx = newActive;
          }
          return { splits, activeIdx };
        }),

      setSplits: (splits) => set({ splits }),

      setTitle: (title) => set({ title }),

      toggleSplitDone: (id) =>
        set((s) => ({
          splits: s.splits.map((sp) =>
            sp.id === id ? { ...sp, done: !sp.done } : sp
          ),
        })),

      setActiveTemplateId: (id) => set({ activeTemplateId: id }),

      jumpToSplit: (id) =>
        set((s) => {
          const idx = s.splits.findIndex((sp) => sp.id === id);
          if (idx < 0) return s;
          const now = performance.now();
          // accumulate elapsed on currently active split before jumping
          let splits = s.splits.slice();
          if (s.isRunning && s.splitStartedAt !== null) {
            const elapsed = now - s.splitStartedAt;
            splits = splits.map((sp, i) =>
              i === s.activeIdx ? { ...sp, timeMs: sp.timeMs + elapsed } : sp
            );
          }
          splits = splits.map((sp, i) => ({ ...sp, done: i < idx }));
          return {
            splits,
            activeIdx: idx,
            splitStartedAt: s.isRunning ? now : s.splitStartedAt,
            isFinished: false,
          };
        }),
    }),
    {
      name: "hitcounter-run",
      partialize: (s) => ({
        title: s.title,
        splits: s.splits.map((sp) => ({
          ...sp,
          hits: 0,
          timeMs: 0,
        })),
        totalPbHits: s.totalPbHits,
        totalPbTimeMs: s.totalPbTimeMs,
        activeTemplateId: s.activeTemplateId,
      }),
    }
  )
);

export const liveRunElapsed = (s: RunState) =>
  s.runElapsedMs + (s.isRunning && s.runStartedAt ? performance.now() - s.runStartedAt : 0);

export const liveSplitElapsed = (s: RunState) => {
  const sp = s.splits[s.activeIdx];
  if (!sp) return 0;
  return (
    sp.timeMs +
    (s.isRunning && s.splitStartedAt ? performance.now() - s.splitStartedAt : 0)
  );
};

export const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms));
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  return h > 0
    ? `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`
    : `${pad(m)}:${pad(s)}.${pad(cs)}`;
};
