import { useState } from "react";
import {
  BUILTIN_TEMPLATES,
  Template,
  applyTemplate,
  saveCurrentAsTemplate,
  useTemplates,
} from "./templates";
import { useRun } from "./store";

export function TemplatesPanel({ onClose }: { onClose: () => void }) {
  const customs = useTemplates((s) => s.customs);
  const removeCustom = useTemplates((s) => s.remove);
  const renameCustom = useTemplates((s) => s.rename);
  const [saveName, setSaveName] = useState("");
  const [filter, setFilter] = useState("");

  function tryApply(t: Template) {
    const s = useRun.getState();
    const hasPb =
      s.totalPbHits !== null ||
      s.totalPbTimeMs !== null ||
      s.splits.some((sp) => sp.pbHits !== null || sp.pbTimeMs !== null);
    if (hasPb) {
      if (
        !confirm(
          `Apply "${t.name}"?\n\nThis REPLACES current splits and CLEARS PBs.`
        )
      )
        return;
    }
    applyTemplate(t);
    onClose();
  }

  function saveCurrent() {
    const name = saveName.trim();
    if (!name) return;
    saveCurrentAsTemplate(name);
    setSaveName("");
  }

  const f = filter.trim().toLowerCase();
  const filt = (list: Template[]) =>
    !f
      ? list
      : list.filter(
          (t) =>
            t.name.toLowerCase().includes(f) ||
            (t.game ?? "").toLowerCase().includes(f) ||
            t.splits.some((sp) => sp.toLowerCase().includes(f))
        );

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div
        className="hc-modal hc-modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hc-modal-head">
          <h3>Templates</h3>
          <button className="hc-x" onClick={onClose}>×</button>
        </header>

        <input
          className="hc-tpl-filter"
          placeholder="Filter by game, name, or split..."
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
        />

        <section className="hc-tpl-section">
          <h4>Built-in</h4>
          <div className="hc-tpl-grid">
            {filt(BUILTIN_TEMPLATES).map((t) => (
              <TemplateCard key={t.id} t={t} onApply={() => tryApply(t)} />
            ))}
          </div>
        </section>

        <section className="hc-tpl-section">
          <h4>My templates</h4>
          {customs.length === 0 ? (
            <div className="hc-empty">
              No custom templates. Save your current setup below.
            </div>
          ) : (
            <div className="hc-tpl-grid">
              {filt(customs).map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  onApply={() => tryApply(t)}
                  onRemove={() => removeCustom(t.id)}
                  onRename={(name) => renameCustom(t.id, name)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="hc-modal-foot">
          <input
            placeholder="Save current as..."
            value={saveName}
            onChange={(e) => setSaveName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveCurrent();
            }}
            style={{
              flex: 1,
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: "8px 12px",
              borderRadius: 8,
            }}
          />
          <button onClick={saveCurrent} disabled={!saveName.trim()}>
            Save current
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  t,
  onApply,
  onRemove,
  onRename,
}: {
  t: Template;
  onApply: () => void;
  onRemove?: () => void;
  onRename?: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(t.name);

  return (
    <div className="hc-tpl-card">
      <div className="hc-tpl-head">
        {editing && onRename ? (
          <input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onBlur={() => {
              if (name.trim() && name !== t.name) onRename(name.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            }}
            autoFocus
          />
        ) : (
          <b
            onClick={() => onRename && setEditing(true)}
            title={onRename ? "Click to rename" : ""}
          >
            {t.name}
          </b>
        )}
        {t.game && <small>{t.game}</small>}
      </div>
      <div className="hc-tpl-count">{t.splits.length} splits</div>
      <div className="hc-tpl-preview">
        {t.splits.slice(0, 4).join(" · ")}
        {t.splits.length > 4 ? " …" : ""}
      </div>
      <div className="hc-tpl-actions">
        <button onClick={onApply}>Apply</button>
        {onRemove && (
          <button
            onClick={() => {
              if (confirm(`Delete template "${t.name}"?`)) onRemove();
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
