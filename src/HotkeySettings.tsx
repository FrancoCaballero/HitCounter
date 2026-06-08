import { useEffect, useState } from "react";
import { useHotkeys, HotkeyAction, applyHotkeys } from "./hotkeys";

const LABELS: Record<HotkeyAction, string> = {
  addHit: "+ Hit",
  undoHit: "Undo Hit",
  nextSplit: "Next Split",
  startPause: "Start / Pause",
  reset: "Reset",
};

const MODIFIER_KEYS = new Set([
  "Control",
  "Shift",
  "Alt",
  "Meta",
  "OS",
  "ContextMenu",
]);

function eventToAccel(e: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("CommandOrControl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Super");

  let key = e.code;
  if (key.startsWith("Key")) key = key.slice(3);
  else if (key.startsWith("Digit")) key = key.slice(5);
  else if (key.startsWith("Numpad")) key = "Num" + key.slice(6);
  else if (key === "Space") key = "Space";
  else if (key === "Backspace") key = "Backspace";
  else if (key === "Enter") key = "Enter";
  else if (key === "Escape") key = "Escape";
  else if (/^F\d{1,2}$/.test(e.key)) key = e.key;

  parts.push(key);
  return parts.join("+");
}

export function HotkeySettings({ onClose }: { onClose: () => void }) {
  const { hotkeys, enabled, setHotkey, setEnabled, resetDefaults } = useHotkeys();
  const [capturing, setCapturing] = useState<HotkeyAction | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const accel = eventToAccel(e);
      if (!accel) return;
      setHotkey(capturing, accel);
      setCapturing(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing, setHotkey]);

  async function retry() {
    const res = await applyHotkeys();
    setStatus(
      res.ok ? "All hotkeys registered." : `Failed: ${res.failed.join(", ")}`
    );
  }

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div className="hc-modal" onClick={(e) => e.stopPropagation()}>
        <header className="hc-modal-head">
          <h3>Global Hotkeys</h3>
          <button className="hc-x" onClick={onClose}>×</button>
        </header>

        <label className="hc-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />
          Enabled (work globally without app focus)
        </label>

        <div className="hc-hk-list">
          {(Object.keys(LABELS) as HotkeyAction[]).map((a) => (
            <div key={a} className="hc-hk-row">
              <span>{LABELS[a]}</span>
              <button
                className={`hc-hk-btn ${capturing === a ? "capturing" : ""}`}
                onClick={() => setCapturing(capturing === a ? null : a)}
              >
                {capturing === a ? "Press a key..." : hotkeys[a] || "—"}
              </button>
            </div>
          ))}
        </div>

        {status && <p className="hc-status">{status}</p>}

        <div className="hc-modal-foot">
          <button onClick={resetDefaults}>Reset defaults</button>
          <button onClick={retry}>Re-apply</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
