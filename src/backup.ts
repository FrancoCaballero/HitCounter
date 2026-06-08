import { useRun } from "./store";
import { useHistory } from "./history";
import { useHotkeys } from "./hotkeys";
import { useTemplates } from "./templates";
import { applyHotkeys } from "./hotkeys";

const BACKUP_VERSION = 1;

export type Backup = {
  version: number;
  exportedAt: number;
  run: {
    title: string;
    splits: ReturnType<typeof useRun.getState>["splits"];
    totalPbHits: number | null;
    totalPbTimeMs: number | null;
  };
  history: ReturnType<typeof useHistory.getState>["runs"];
  hotkeys: {
    map: ReturnType<typeof useHotkeys.getState>["hotkeys"];
    enabled: boolean;
  };
  templates: ReturnType<typeof useTemplates.getState>["customs"];
};

export function exportBackup(): Backup {
  const r = useRun.getState();
  const h = useHistory.getState();
  const hk = useHotkeys.getState();
  const t = useTemplates.getState();
  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    run: {
      title: r.title,
      splits: r.splits,
      totalPbHits: r.totalPbHits,
      totalPbTimeMs: r.totalPbTimeMs,
    },
    history: h.runs,
    hotkeys: { map: hk.hotkeys, enabled: hk.enabled },
    templates: t.customs,
  };
}

export function exportBackupJson(): string {
  return JSON.stringify(exportBackup(), null, 2);
}

export function downloadBackup() {
  const blob = new Blob([exportBackupJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hitcounter-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportOpts = {
  run?: boolean;
  history?: boolean;
  hotkeys?: boolean;
  templates?: boolean;
};

export async function importBackup(
  json: string,
  opts: ImportOpts = { run: true, history: true, hotkeys: true, templates: true }
): Promise<{ ok: true } | { ok: false; error: string }> {
  let data: Backup;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: "Invalid JSON" };
  }
  if (typeof data !== "object" || data === null) {
    return { ok: false, error: "Not an object" };
  }
  if (data.version !== BACKUP_VERSION) {
    return { ok: false, error: `Unsupported backup version: ${data.version}` };
  }

  if (opts.run && data.run) {
    useRun.setState({
      title: data.run.title ?? "",
      splits: data.run.splits.map((sp) => ({
        ...sp,
        hits: 0,
        timeMs: 0,
      })),
      activeIdx: 0,
      totalHits: 0,
      totalPbHits: data.run.totalPbHits ?? null,
      totalPbTimeMs: data.run.totalPbTimeMs ?? null,
      runStartedAt: null,
      splitStartedAt: null,
      runElapsedMs: 0,
      isRunning: false,
      isFinished: false,
    });
  }
  if (opts.history && Array.isArray(data.history)) {
    useHistory.setState({ runs: data.history });
  }
  if (opts.hotkeys && data.hotkeys) {
    useHotkeys.setState({
      hotkeys: data.hotkeys.map,
      enabled: data.hotkeys.enabled ?? true,
    });
    await applyHotkeys();
  }
  if (opts.templates && Array.isArray(data.templates)) {
    useTemplates.setState({ customs: data.templates });
  }
  return { ok: true };
}

export function wipeAll() {
  useRun.setState({
    title: "",
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
    activeIdx: 0,
    totalHits: 0,
    totalPbHits: null,
    totalPbTimeMs: null,
    runStartedAt: null,
    splitStartedAt: null,
    runElapsedMs: 0,
    isRunning: false,
    isFinished: false,
  });
  useHistory.setState({ runs: [] });
  useTemplates.setState({ customs: [] });
}
