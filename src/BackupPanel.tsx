import { useRef, useState } from "react";
import {
  downloadBackup,
  exportBackupJson,
  importBackup,
  wipeAll,
  ImportOpts,
} from "./backup";
import { confirmDialog } from "./Confirm";

export function BackupPanel({ onClose }: { onClose: () => void }) {
  const [pasted, setPasted] = useState("");
  const [status, setStatus] = useState<string>("");
  const [opts, setOpts] = useState<ImportOpts>({
    run: true,
    history: true,
    hotkeys: true,
    templates: true,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  async function copyJson() {
    await navigator.clipboard.writeText(exportBackupJson());
    setStatus("Backup copied to clipboard.");
  }

  async function doImport(json: string) {
    setStatus("Importing...");
    const res = await importBackup(json, opts);
    if (res.ok) setStatus("Import OK. Sections restored.");
    else setStatus(`Error: ${res.error}`);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    await doImport(text);
    e.target.value = "";
  }

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div
        className="hc-modal hc-modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hc-modal-head">
          <h3>Backup / Restore</h3>
          <button className="hc-x" onClick={onClose}>×</button>
        </header>

        <section className="hc-bk-section">
          <h4>Export</h4>
          <p className="hc-muted">
            Bundles current splits + PBs, run history, custom templates,
            hotkeys map into one JSON file.
          </p>
          <div className="hc-bk-actions">
            <button onClick={downloadBackup}>Download .json</button>
            <button onClick={copyJson}>Copy to clipboard</button>
          </div>
        </section>

        <section className="hc-bk-section">
          <h4>Import</h4>
          <div className="hc-bk-checks">
            {(["run", "history", "hotkeys", "templates"] as const).map((k) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={!!opts[k]}
                  onChange={(e) =>
                    setOpts((o) => ({ ...o, [k]: e.currentTarget.checked }))
                  }
                />
                <span>{k}</span>
              </label>
            ))}
          </div>
          <div className="hc-bk-actions">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              style={{ display: "none" }}
            />
            <button onClick={() => fileRef.current?.click()}>
              Load .json file
            </button>
            <button
              onClick={() => {
                if (!pasted.trim()) {
                  setStatus("Paste JSON first.");
                  return;
                }
                doImport(pasted);
              }}
            >
              Import from text
            </button>
          </div>
          <textarea
            placeholder="Or paste backup JSON here..."
            value={pasted}
            onChange={(e) => setPasted(e.currentTarget.value)}
            className="hc-bk-textarea"
            rows={6}
          />
        </section>

        <section className="hc-bk-section hc-bk-danger">
          <h4>Danger zone</h4>
          <p className="hc-muted">
            Wipes splits, PBs, history, custom templates. Hotkeys map is kept.
          </p>
          <div className="hc-bk-actions">
            <button
              className="hc-danger"
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Wipe all data",
                  message:
                    "Wipe ALL local data (splits, PBs, history, templates)? Cannot undo.",
                  confirmText: "Wipe all",
                  danger: true,
                });
                if (ok) {
                  wipeAll();
                  setStatus("All data wiped.");
                }
              }}
            >
              Wipe all data
            </button>
          </div>
        </section>

        {status && <p className="hc-status">{status}</p>}

        <div className="hc-modal-foot">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
