import {
  register,
  unregisterAll,
  isRegistered,
} from "@tauri-apps/plugin-global-shortcut";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useRun } from "./store";

export type HotkeyAction =
  | "addHit"
  | "undoHit"
  | "nextSplit"
  | "startPause"
  | "reset";

export type HotkeyMap = Record<HotkeyAction, string>;

const DEFAULT_HOTKEYS: HotkeyMap = {
  addHit: "F1",
  undoHit: "F2",
  nextSplit: "F3",
  startPause: "F4",
  reset: "F5",
};

type HotkeyStore = {
  hotkeys: HotkeyMap;
  enabled: boolean;
  setHotkey: (action: HotkeyAction, accel: string) => void;
  setEnabled: (v: boolean) => void;
  resetDefaults: () => void;
};

export const useHotkeys = create<HotkeyStore>()(
  persist(
    (set) => ({
      hotkeys: { ...DEFAULT_HOTKEYS },
      enabled: true,
      setHotkey: (action, accel) =>
        set((s) => ({ hotkeys: { ...s.hotkeys, [action]: accel } })),
      setEnabled: (v) => set({ enabled: v }),
      resetDefaults: () => set({ hotkeys: { ...DEFAULT_HOTKEYS } }),
    }),
    { name: "hitcounter-hotkeys" }
  )
);

function handler(action: HotkeyAction) {
  const r = useRun.getState();
  switch (action) {
    case "addHit":
      r.addHit();
      break;
    case "undoHit":
      r.undoHit();
      break;
    case "nextSplit":
      r.nextSplit();
      break;
    case "startPause":
      if (r.isFinished) r.resetRun();
      else if (!r.isRunning) {
        if (r.runStartedAt === null && r.runElapsedMs === 0) r.startRun();
        else r.resumeRun();
      } else r.pauseRun();
      break;
    case "reset":
      r.resetRun();
      break;
  }
}

let currentRegistered: string[] = [];

async function safeUnregisterAll() {
  try {
    await unregisterAll();
  } catch {}
  currentRegistered = [];
}

export async function applyHotkeys() {
  await safeUnregisterAll();
  const { hotkeys, enabled } = useHotkeys.getState();
  if (!enabled) return { ok: true as const, failed: [] as string[] };
  const failed: string[] = [];
  for (const action of Object.keys(hotkeys) as HotkeyAction[]) {
    const accel = hotkeys[action];
    if (!accel) continue;
    try {
      if (await isRegistered(accel)) {
        failed.push(`${action}:${accel} (in use)`);
        continue;
      }
      await register(accel, (e) => {
        if (e.state === "Pressed") handler(action);
      });
      currentRegistered.push(accel);
    } catch (err) {
      failed.push(`${action}:${accel} (${String(err)})`);
    }
  }
  return { ok: failed.length === 0, failed };
}

export function startHotkeys() {
  applyHotkeys();
  useHotkeys.subscribe(() => {
    applyHotkeys();
  });
}
