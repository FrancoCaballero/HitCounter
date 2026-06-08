import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Split, useRun } from "./store";

export type SubrunSnapshot = {
  splits: Split[];
  totalPbHits: number | null;
  totalPbTimeMs: number | null;
};

export type Subrun = {
  id: string;
  name: string;
  completed: boolean;
  snapshot: SubrunSnapshot | null;
};

export type Multirun = {
  id: string;
  title: string;
  runs: Subrun[];
};

type MultirunState = {
  multiruns: Multirun[];
  activeMultirunId: string | null;
  activeSubrunId: string | null;

  createMultirun: (title: string, runNames: string[]) => string;
  removeMultirun: (id: string) => void;
  renameMultirun: (id: string, title: string) => void;
  addSubrun: (mId: string, name: string, snapshot?: SubrunSnapshot) => void;
  removeSubrun: (mId: string, sId: string) => void;
  duplicateSubrun: (mId: string, sId: string) => string | null;
  renameSubrun: (mId: string, sId: string, name: string) => void;
  toggleSubrunCompleted: (mId: string, sId: string) => void;
  moveSubrun: (mId: string, sId: string, dir: -1 | 1) => void;
  selectSubrun: (mId: string, sId: string) => void;
  saveCurrentToActive: () => void;
  clearActive: () => void;
};

const emptySnapshot = (): SubrunSnapshot => ({
  splits: [
    {
      id: crypto.randomUUID(),
      name: "Split 1",
      hits: 0,
      timeMs: 0,
      pbHits: null,
      pbTimeMs: null,
    },
  ],
  totalPbHits: null,
  totalPbTimeMs: null,
});

export const snapshotFromTemplateSplits = (
  splitNames: string[]
): SubrunSnapshot => ({
  splits: (splitNames.length ? splitNames : ["Split 1"]).map((n) => ({
    id: crypto.randomUUID(),
    name: n,
    hits: 0,
    timeMs: 0,
    pbHits: null,
    pbTimeMs: null,
  })),
  totalPbHits: null,
  totalPbTimeMs: null,
});

export const snapshotFromCurrentRun = (): SubrunSnapshot => snapshotFromRun();

const snapshotFromRun = (): SubrunSnapshot => {
  const s = useRun.getState();
  return {
    splits: s.splits.map((sp) => ({
      ...sp,
      hits: 0,
      timeMs: 0,
    })),
    totalPbHits: s.totalPbHits,
    totalPbTimeMs: s.totalPbTimeMs,
  };
};

const loadSnapshot = (m: Multirun, sub: Subrun) => {
  const snap = sub.snapshot ?? emptySnapshot();
  useRun.setState({
    title: `${m.title} — ${sub.name}`,
    splits: snap.splits.map((sp) => ({ ...sp, hits: 0, timeMs: 0 })),
    activeIdx: 0,
    totalHits: 0,
    totalPbHits: snap.totalPbHits,
    totalPbTimeMs: snap.totalPbTimeMs,
    runStartedAt: null,
    splitStartedAt: null,
    runElapsedMs: 0,
    isRunning: false,
    isFinished: false,
    activeTemplateId: null,
  });
};

export const useMultirun = create<MultirunState>()(
  persist(
    (set, get) => ({
      multiruns: [],
      activeMultirunId: null,
      activeSubrunId: null,

      createMultirun: (title, runNames) => {
        const id = crypto.randomUUID();
        const m: Multirun = {
          id,
          title,
          runs: runNames.map((n) => ({
            id: crypto.randomUUID(),
            name: n,
            completed: false,
            snapshot: null,
          })),
        };
        set((s) => ({ multiruns: [...s.multiruns, m] }));
        return id;
      },

      removeMultirun: (id) =>
        set((s) => ({
          multiruns: s.multiruns.filter((m) => m.id !== id),
          activeMultirunId: s.activeMultirunId === id ? null : s.activeMultirunId,
          activeSubrunId: s.activeMultirunId === id ? null : s.activeSubrunId,
        })),

      renameMultirun: (id, title) =>
        set((s) => ({
          multiruns: s.multiruns.map((m) => (m.id === id ? { ...m, title } : m)),
        })),

      addSubrun: (mId, name, snapshot) =>
        set((s) => ({
          multiruns: s.multiruns.map((m) =>
            m.id === mId
              ? {
                  ...m,
                  runs: [
                    ...m.runs,
                    {
                      id: crypto.randomUUID(),
                      name,
                      completed: false,
                      snapshot: snapshot ?? null,
                    },
                  ],
                }
              : m
          ),
        })),

      duplicateSubrun: (mId, sId) => {
        const s = get();
        const m = s.multiruns.find((x) => x.id === mId);
        const idx = m?.runs.findIndex((r) => r.id === sId) ?? -1;
        if (!m || idx < 0) return null;
        const orig = m.runs[idx];
        const copy: Subrun = {
          id: crypto.randomUUID(),
          name: `${orig.name} (copy)`,
          completed: false,
          snapshot: orig.snapshot
            ? {
                splits: orig.snapshot.splits.map((sp) => ({
                  ...sp,
                  id: crypto.randomUUID(),
                  hits: 0,
                  timeMs: 0,
                })),
                totalPbHits: orig.snapshot.totalPbHits,
                totalPbTimeMs: orig.snapshot.totalPbTimeMs,
              }
            : null,
        };
        set({
          multiruns: s.multiruns.map((mm) => {
            if (mm.id !== mId) return mm;
            const runs = mm.runs.slice();
            runs.splice(idx + 1, 0, copy);
            return { ...mm, runs };
          }),
        });
        return copy.id;
      },

      removeSubrun: (mId, sId) =>
        set((s) => ({
          multiruns: s.multiruns.map((m) =>
            m.id === mId ? { ...m, runs: m.runs.filter((r) => r.id !== sId) } : m
          ),
          activeSubrunId: s.activeSubrunId === sId ? null : s.activeSubrunId,
        })),

      renameSubrun: (mId, sId, name) =>
        set((s) => ({
          multiruns: s.multiruns.map((m) =>
            m.id === mId
              ? {
                  ...m,
                  runs: m.runs.map((r) => (r.id === sId ? { ...r, name } : r)),
                }
              : m
          ),
        })),

      toggleSubrunCompleted: (mId, sId) =>
        set((s) => ({
          multiruns: s.multiruns.map((m) =>
            m.id === mId
              ? {
                  ...m,
                  runs: m.runs.map((r) =>
                    r.id === sId ? { ...r, completed: !r.completed } : r
                  ),
                }
              : m
          ),
        })),

      moveSubrun: (mId, sId, dir) =>
        set((s) => ({
          multiruns: s.multiruns.map((m) => {
            if (m.id !== mId) return m;
            const idx = m.runs.findIndex((r) => r.id === sId);
            if (idx < 0) return m;
            const target = idx + dir;
            if (target < 0 || target >= m.runs.length) return m;
            const runs = m.runs.slice();
            [runs[idx], runs[target]] = [runs[target], runs[idx]];
            return { ...m, runs };
          }),
        })),

      selectSubrun: (mId, sId) => {
        const s = get();
        // save current run state into previously active sub-run
        if (s.activeMultirunId && s.activeSubrunId) {
          const snap = snapshotFromRun();
          set({
            multiruns: s.multiruns.map((m) =>
              m.id === s.activeMultirunId
                ? {
                    ...m,
                    runs: m.runs.map((r) =>
                      r.id === s.activeSubrunId ? { ...r, snapshot: snap } : r
                    ),
                  }
                : m
            ),
          });
        }
        const fresh = get();
        const m = fresh.multiruns.find((x) => x.id === mId);
        const sub = m?.runs.find((r) => r.id === sId);
        if (!m || !sub) return;
        loadSnapshot(m, sub);
        set({ activeMultirunId: mId, activeSubrunId: sId });
      },

      saveCurrentToActive: () => {
        const s = get();
        if (!s.activeMultirunId || !s.activeSubrunId) return;
        const snap = snapshotFromRun();
        set({
          multiruns: s.multiruns.map((m) =>
            m.id === s.activeMultirunId
              ? {
                  ...m,
                  runs: m.runs.map((r) =>
                    r.id === s.activeSubrunId ? { ...r, snapshot: snap } : r
                  ),
                }
              : m
          ),
        });
      },

      clearActive: () => set({ activeMultirunId: null, activeSubrunId: null }),
    }),
    { name: "hitcounter-multirun" }
  )
);

// auto-mark active sub-run as completed when run finishes
let prevFinished = false;
useRun.subscribe((s) => {
  const finished = s.isFinished;
  if (finished && !prevFinished) {
    const mr = useMultirun.getState();
    if (mr.activeMultirunId && mr.activeSubrunId) {
      const mId = mr.activeMultirunId;
      const sId = mr.activeSubrunId;
      useMultirun.setState({
        multiruns: mr.multiruns.map((m) =>
          m.id === mId
            ? {
                ...m,
                runs: m.runs.map((r) =>
                  r.id === sId ? { ...r, completed: true } : r
                ),
              }
            : m
        ),
      });
      mr.saveCurrentToActive();
    }
  }
  prevFinished = finished;
});
