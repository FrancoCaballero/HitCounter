import { useEffect, useRef, useState } from "react";
import { getOverlayUrl, loadStyle, pushStyle, DEFAULT_STYLE, OverlayStyle, BG_PRESETS, Background, BackgroundFit } from "./sync";

type Theme = {
  id: string;
  name: string;
  desc: string;
};

const TITLE_FONTS: { id: string; name: string; family: string }[] = [
  { id: "", name: "System default", family: "ui-sans-serif, system-ui" },
  { id: "cinzel", name: "Cinzel (epic/medieval)", family: '"Cinzel", serif' },
  { id: "orbitron", name: "Orbitron (sci-fi)", family: '"Orbitron", sans-serif' },
  { id: "pressstart", name: "Press Start 2P (retro 8-bit)", family: '"Press Start 2P", monospace' },
  { id: "russo", name: "Russo One (esports)", family: '"Russo One", sans-serif' },
  { id: "blackops", name: "Black Ops One (military)", family: '"Black Ops One", system-ui' },
  { id: "bebas", name: "Bebas Neue (bold display)", family: '"Bebas Neue", sans-serif' },
  { id: "audiowide", name: "Audiowide (futuristic)", family: '"Audiowide", sans-serif' },
  { id: "creepster", name: "Creepster (horror)", family: '"Creepster", system-ui' },
  { id: "bungee", name: "Bungee (urban)", family: '"Bungee", sans-serif' },
  { id: "metal", name: "Metal Mania (metal/dark)", family: '"Metal Mania", system-ui' },
];

const THEMES: Theme[] = [
  { id: "default", name: "Default", desc: "Hits + timer + active split (recommended)" },
  { id: "compact", name: "Compact", desc: "Single row: hits · time" },
  { id: "vertical", name: "Vertical", desc: "Stacked, huge hits on top" },
  { id: "hits", name: "Hits Only", desc: "Giant hit counter, nothing else" },
  { id: "minimal", name: "Minimal", desc: "Tiny everything, edge of screen" },
  { id: "bigsplit", name: "Big Split", desc: "Emphasis on current split name" },
  { id: "table", name: "Splits Table", desc: "All splits listed as a table (LiveSplit style)" },
];

export function OverlayPanel({ onClose }: { onClose: () => void }) {
  const initial = loadStyle();
  const [theme, setTheme] = useState(initial.theme);
  const [accent, setAccent] = useState(initial.accent);
  const [text, setText] = useState(initial.text);
  const [scale, setScale] = useState(initial.scale);
  const [noShadow, setNoShadow] = useState(initial.noShadow);
  const [titleFont, setTitleFont] = useState(initial.titleFont);
  const [tableRows, setTableRows] = useState(initial.tableRows);
  const [background, setBackground] = useState<Background>(initial.background);
  const [bgError, setBgError] = useState<string | null>(null);
  const [show, setShow] = useState(initial.show);
  const [base, setBase] = useState("http://localhost:17800/");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    getOverlayUrl().then(setBase);
  }, []);

  const style: OverlayStyle = { theme, accent, text, scale, noShadow, titleFont, tableRows, background, show };

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      pushStyle(style);
    }, 80);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [theme, accent, text, scale, noShadow, titleFont, tableRows, background, show]);

  function toggle(key: keyof OverlayStyle["show"]) {
    setShow((s) => ({ ...s, [key]: !s[key] }));
  }

  async function copy() {
    await navigator.clipboard.writeText(base);
  }

  function onPickImage(file: File) {
    setBgError(null);
    const MAX = 4 * 1024 * 1024;
    if (file.size > MAX) {
      setBgError(`Imagen muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máx 4MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setBackground({ kind: "image", value: dataUrl, fit: background.fit || "cover" });
    };
    reader.onerror = () => setBgError("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
  }

  function reset() {
    setTheme(DEFAULT_STYLE.theme);
    setAccent(DEFAULT_STYLE.accent);
    setText(DEFAULT_STYLE.text);
    setScale(DEFAULT_STYLE.scale);
    setNoShadow(DEFAULT_STYLE.noShadow);
    setTitleFont(DEFAULT_STYLE.titleFont);
    setTableRows(DEFAULT_STYLE.tableRows);
    setBackground({ ...DEFAULT_STYLE.background });
    setBgError(null);
    setShow({ ...DEFAULT_STYLE.show });
  }

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div className="hc-modal hc-modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="hc-modal-head">
          <h3>Overlay Themes</h3>
          <button className="hc-x" onClick={onClose}>×</button>
        </header>

        <div className="hc-modal-body">
        <section className="hc-theme-grid">
          {THEMES.map((t) => (
            <div
              key={t.id}
              className={`hc-theme-card ${theme === t.id ? "active" : ""}`}
              onClick={() => setTheme(t.id)}
            >
              <b>{t.name}</b>
              <small>{t.desc}</small>
            </div>
          ))}
        </section>

        <section className="hc-theme-customize">
          <h4>Customize</h4>
          <div className="hc-theme-fields">
            <label>
              <span>Accent</span>
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.currentTarget.value)}
              />
            </label>
            <label>
              <span>Text</span>
              <input
                type="color"
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
              />
            </label>
            <label>
              <span>Scale {scale.toFixed(2)}×</span>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.currentTarget.value))}
              />
            </label>
            <label className="hc-theme-check">
              <input
                type="checkbox"
                checked={noShadow}
                onChange={(e) => setNoShadow(e.currentTarget.checked)}
              />
              <span>No shadow</span>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span>Title font</span>
              <select
                value={titleFont}
                onChange={(e) => setTitleFont(e.currentTarget.value)}
                className="hc-font-select"
              >
                {TITLE_FONTS.map((f) => (
                  <option key={f.id || "default"} value={f.id} style={{ fontFamily: f.family }}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="hc-theme-customize">
          <h4>Elements</h4>
          <div className="hc-theme-fields">
            <label className="hc-theme-check">
              <input type="checkbox" checked={show.title} onChange={() => toggle("title")} />
              <span>Title</span>
            </label>
            <label className="hc-theme-check">
              <input type="checkbox" checked={show.totalHits} onChange={() => toggle("totalHits")} />
              <span>Total hits</span>
            </label>
            <label className="hc-theme-check">
              <input type="checkbox" checked={show.totalTimer} onChange={() => toggle("totalTimer")} />
              <span>Total timer</span>
            </label>
            <label className="hc-theme-check">
              <input type="checkbox" checked={show.totalPb} onChange={() => toggle("totalPb")} />
              <span>PB row</span>
            </label>
            <label className="hc-theme-check">
              <input type="checkbox" checked={show.activeSplit} onChange={() => toggle("activeSplit")} />
              <span>Active split</span>
            </label>
            <label className="hc-theme-check">
              <input type="checkbox" checked={show.multirun} onChange={() => toggle("multirun")} />
              <span>Multirun strip</span>
            </label>
          </div>
          {theme === "table" && (
            <>
              <h4 style={{ marginTop: 12 }}>Table layout</h4>
              <div className="hc-theme-fields">
                <label>
                  <span>Visible rows ({tableRows})</span>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    step={1}
                    value={tableRows}
                    onChange={(e) => setTableRows(parseInt(e.currentTarget.value, 10))}
                  />
                </label>
              </div>
              <h4 style={{ marginTop: 12 }}>Table columns</h4>
              <div className="hc-theme-fields">
                <label className="hc-theme-check">
                  <input type="checkbox" checked={show.colHits} onChange={() => toggle("colHits")} />
                  <span>Hits</span>
                </label>
                <label className="hc-theme-check">
                  <input type="checkbox" checked={show.colDelta} onChange={() => toggle("colDelta")} />
                  <span>Δ</span>
                </label>
                <label className="hc-theme-check">
                  <input type="checkbox" checked={show.colTime} onChange={() => toggle("colTime")} />
                  <span>Time</span>
                </label>
                <label className="hc-theme-check">
                  <input type="checkbox" checked={show.colPb} onChange={() => toggle("colPb")} />
                  <span>PB time</span>
                </label>
                <label className="hc-theme-check">
                  <input type="checkbox" checked={show.tableTotals} onChange={() => toggle("tableTotals")} />
                  <span>Totals row</span>
                </label>
              </div>
            </>
          )}
        </section>

        <section className="hc-theme-customize">
          <h4>Background</h4>
          <div className="hc-bg-modes">
            <button
              className={`hc-bg-mode ${background.kind === "none" ? "active" : ""}`}
              onClick={() => setBackground({ kind: "none", value: "", fit: background.fit })}
            >Transparent</button>
            <button
              className={`hc-bg-mode ${background.kind === "color" ? "active" : ""}`}
              onClick={() => setBackground({ kind: "color", value: background.kind === "color" ? background.value : "#101218", fit: background.fit })}
            >Solid color</button>
            <button
              className={`hc-bg-mode ${background.kind === "preset" ? "active" : ""}`}
              onClick={() => setBackground({ kind: "preset", value: background.kind === "preset" ? background.value : BG_PRESETS[0].id, fit: background.fit })}
            >Preset</button>
            <button
              className={`hc-bg-mode ${background.kind === "image" ? "active" : ""}`}
              onClick={() => {
                if (background.kind !== "image") setBackground({ kind: "image", value: "", fit: background.fit || "cover" });
              }}
            >Image</button>
          </div>

          {background.kind === "color" && (
            <div className="hc-theme-fields" style={{ marginTop: 10 }}>
              <label>
                <span>Color</span>
                <input
                  type="color"
                  value={background.value || "#101218"}
                  onChange={(e) => setBackground({ ...background, value: e.currentTarget.value })}
                />
              </label>
            </div>
          )}

          {background.kind === "preset" && (
            <div className="hc-bg-presets" style={{ marginTop: 10 }}>
              {BG_PRESETS.map((p) => (
                <div
                  key={p.id}
                  className={`hc-bg-preset ${background.value === p.id ? "active" : ""}`}
                  style={{ background: p.css }}
                  onClick={() => setBackground({ ...background, value: p.id })}
                  title={p.name}
                >
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          )}

          {background.kind === "image" && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (f) onPickImage(f);
                  e.currentTarget.value = "";
                }}
              />
              {bgError && <small style={{ color: "var(--bad)" }}>{bgError}</small>}
              {background.value && (
                <>
                  <div className="hc-bg-thumb" style={{ backgroundImage: `url(${background.value})` }} />
                  <div className="hc-theme-fields">
                    <label>
                      <span>Fit</span>
                      <select
                        className="hc-font-select"
                        value={background.fit}
                        onChange={(e) => setBackground({ ...background, fit: e.currentTarget.value as BackgroundFit })}
                      >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="tile">Tile</option>
                      </select>
                    </label>
                    <button
                      onClick={() => setBackground({ kind: "image", value: "", fit: background.fit })}
                    >Remove image</button>
                  </div>
                </>
              )}
              <small style={{ color: "var(--muted)" }}>
                Máx 4MB. La imagen se guarda local y se envía al overlay vía WebSocket.
              </small>
            </div>
          )}
        </section>

        <section className="hc-theme-preview">
          <iframe
            title="overlay preview"
            src={base}
            className="hc-iframe"
          />
        </section>

        <section className="hc-theme-url">
          <input readOnly value={base} onFocus={(e) => e.currentTarget.select()} />
          <button onClick={copy}>Copy</button>
          <small style={{ display: "block", marginTop: 6, opacity: 0.7 }}>
            Pegá esta URL en OBS una vez. Los cambios se aplican en vivo sin tocar OBS.
          </small>
        </section>
        </div>

        <div className="hc-modal-foot">
          <button onClick={reset}>Reset</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
