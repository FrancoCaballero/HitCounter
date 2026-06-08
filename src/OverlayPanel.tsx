import { useEffect, useState } from "react";
import { getOverlayUrl } from "./sync";

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
];

function stripHash(h: string) {
  return h.replace(/^#/, "");
}

export function OverlayPanel({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState("default");
  const [accent, setAccent] = useState("#ffb454");
  const [text, setText] = useState("#ffffff");
  const [scale, setScale] = useState(1);
  const [noShadow, setNoShadow] = useState(false);
  const [titleFont, setTitleFont] = useState("");
  const [base, setBase] = useState("http://localhost:17800/");

  useEffect(() => {
    getOverlayUrl().then(setBase);
  }, []);

  const url = (() => {
    const u = new URL(base);
    u.searchParams.set("theme", theme);
    if (accent !== "#ffb454") u.searchParams.set("accent", stripHash(accent));
    if (text !== "#ffffff") u.searchParams.set("text", stripHash(text));
    if (scale !== 1) u.searchParams.set("scale", String(scale));
    if (noShadow) u.searchParams.set("noshadow", "1");
    if (titleFont) u.searchParams.set("titlefont", titleFont);
    return u.toString();
  })();

  async function copy() {
    await navigator.clipboard.writeText(url);
  }

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div className="hc-modal hc-modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="hc-modal-head">
          <h3>Overlay Themes</h3>
          <button className="hc-x" onClick={onClose}>×</button>
        </header>

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

        <section className="hc-theme-preview">
          <iframe
            title="overlay preview"
            src={url}
            className="hc-iframe"
          />
        </section>

        <section className="hc-theme-url">
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <button onClick={copy}>Copy</button>
        </section>

        <div className="hc-modal-foot">
          <button
            onClick={() => {
              setTheme("default");
              setAccent("#ffb454");
              setText("#ffffff");
              setScale(1);
              setNoShadow(false);
              setTitleFont("");
            }}
          >
            Reset
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
