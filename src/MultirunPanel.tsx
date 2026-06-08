import { useState } from "react";
import {
  Multirun,
  SubrunSnapshot,
  snapshotFromCurrentRun,
  snapshotFromTemplateSplits,
  useMultirun,
} from "./multirun";
import { BUILTIN_TEMPLATES, Template, useTemplates } from "./templates";

export function MultirunPanel({ onClose }: { onClose: () => void }) {
  const multiruns = useMultirun((s) => s.multiruns);
  const activeMultirunId = useMultirun((s) => s.activeMultirunId);
  const activeSubrunId = useMultirun((s) => s.activeSubrunId);

  const createMultirun = useMultirun((s) => s.createMultirun);
  const removeMultirun = useMultirun((s) => s.removeMultirun);
  const renameMultirun = useMultirun((s) => s.renameMultirun);
  const addSubrun = useMultirun((s) => s.addSubrun);
  const removeSubrun = useMultirun((s) => s.removeSubrun);
  const renameSubrun = useMultirun((s) => s.renameSubrun);
  const toggleSubrunCompleted = useMultirun((s) => s.toggleSubrunCompleted);
  const moveSubrun = useMultirun((s) => s.moveSubrun);
  const selectSubrun = useMultirun((s) => s.selectSubrun);
  const clearActive = useMultirun((s) => s.clearActive);

  const customs = useTemplates((s) => s.customs);
  const allTemplates: Template[] = [...BUILTIN_TEMPLATES, ...customs];

  const [newTitle, setNewTitle] = useState("");
  const [newRuns, setNewRuns] = useState("");
  const [draftRuns, setDraftRuns] = useState<
    { name: string; snapshot: SubrunSnapshot | null }[]
  >([]);
  const [pickTplId, setPickTplId] = useState("");
  function create() {
    const title = newTitle.trim();
    const typed = newRuns
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((n) => ({ name: n, snapshot: null as SubrunSnapshot | null }));
    const all = [...draftRuns, ...typed];
    if (!title || all.length === 0) return;
    const id = createMultirun(
      title,
      all.map((r) => r.name)
    );
    // attach snapshots for drafts that had one
    const mr = useMultirun.getState();
    const created = mr.multiruns.find((m) => m.id === id);
    if (created) {
      created.runs.forEach((r, i) => {
        const src = all[i];
        if (src?.snapshot) {
          useMultirun.setState({
            multiruns: useMultirun.getState().multiruns.map((m) =>
              m.id === id
                ? {
                    ...m,
                    runs: m.runs.map((rr) =>
                      rr.id === r.id ? { ...rr, snapshot: src.snapshot } : rr
                    ),
                  }
                : m
            ),
          });
        }
      });
    }
    setNewTitle("");
    setNewRuns("");
    setDraftRuns([]);
    setPickTplId("");
  }

  function addDraftFromTemplate() {
    const t = allTemplates.find((x) => x.id === pickTplId);
    if (!t) return;
    setDraftRuns((d) => [
      ...d,
      { name: t.name, snapshot: snapshotFromTemplateSplits(t.splits) },
    ]);
    setPickTplId("");
  }

  function addDraftFromCurrent() {
    setDraftRuns((d) => [
      ...d,
      { name: "Current run", snapshot: snapshotFromCurrentRun() },
    ]);
  }

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div
        className="hc-modal hc-modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hc-modal-head">
          <h3>Multirun</h3>
          <button className="hc-x" onClick={onClose}>×</button>
        </header>

        <div className="hc-modal-body">
          <section className="hc-tpl-section">
            <h4>Create new multirun</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                placeholder='Multirun title (e.g. "Trilogy Dark Souls")'
                value={newTitle}
                onChange={(e) => setNewTitle(e.currentTarget.value)}
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              />
              <textarea
                placeholder="Run names, one per line or comma-separated (e.g. ds1, ds2, ds3)"
                value={newRuns}
                onChange={(e) => setNewRuns(e.currentTarget.value)}
                rows={3}
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={pickTplId}
                  onChange={(e) => setPickTplId(e.currentTarget.value)}
                  className="hc-font-select"
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <option value="">Pick saved run...</option>
                  <optgroup label="Built-in">
                    {BUILTIN_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                  {customs.length > 0 && (
                    <optgroup label="My templates">
                      {customs.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button onClick={addDraftFromTemplate} disabled={!pickTplId}>
                  + Add saved run
                </button>
                <button onClick={addDraftFromCurrent}>
                  + Add current run
                </button>
              </div>
              {draftRuns.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {draftRuns.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "var(--panel-2)",
                        border: "1px solid var(--accent)",
                        color: "var(--text)",
                        fontSize: 13,
                      }}
                    >
                      {d.name}
                      <button
                        className="hc-x"
                        onClick={() =>
                          setDraftRuns((arr) => arr.filter((_, j) => j !== i))
                        }
                        title="Remove"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={create}
                disabled={!newTitle.trim() || (!newRuns.trim() && draftRuns.length === 0)}
              >
                Create multirun
              </button>
            </div>
          </section>

          <section className="hc-tpl-section">
            <h4>My multiruns</h4>
            {multiruns.length === 0 ? (
              <div className="hc-empty">No multiruns yet. Create one above.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {multiruns.map((m) => (
                  <MultirunCard
                    key={m.id}
                    m={m}
                    isActiveMultirun={m.id === activeMultirunId}
                    activeSubrunId={activeSubrunId}
                    onRenameMultirun={(t) => renameMultirun(m.id, t)}
                    onRemoveMultirun={() => {
                      if (confirm(`Delete multirun "${m.title}"?`))
                        removeMultirun(m.id);
                    }}
                    onAddSubrun={(name, snap) => addSubrun(m.id, name, snap)}
                    templates={allTemplates}
                    customs={customs}
                    onRemoveSubrun={(sId) => removeSubrun(m.id, sId)}
                    onRenameSubrun={(sId, name) => renameSubrun(m.id, sId, name)}
                    onToggleCompleted={(sId) => toggleSubrunCompleted(m.id, sId)}
                    onMoveSubrun={(sId, dir) => moveSubrun(m.id, sId, dir)}
                    onSelectSubrun={(sId) => {
                      selectSubrun(m.id, sId);
                      onClose();
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="hc-modal-foot">
          {activeMultirunId && (
            <button onClick={clearActive}>Deactivate current multirun</button>
          )}
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function MultirunCard({
  m,
  isActiveMultirun,
  activeSubrunId,
  templates,
  customs,
  onRenameMultirun,
  onRemoveMultirun,
  onAddSubrun,
  onRemoveSubrun,
  onRenameSubrun,
  onToggleCompleted,
  onMoveSubrun,
  onSelectSubrun,
}: {
  m: Multirun;
  isActiveMultirun: boolean;
  activeSubrunId: string | null;
  templates: Template[];
  customs: Template[];
  onRenameMultirun: (title: string) => void;
  onRemoveMultirun: () => void;
  onAddSubrun: (name: string, snapshot?: SubrunSnapshot) => void;
  onRemoveSubrun: (sId: string) => void;
  onRenameSubrun: (sId: string, name: string) => void;
  onToggleCompleted: (sId: string) => void;
  onMoveSubrun: (sId: string, dir: -1 | 1) => void;
  onSelectSubrun: (sId: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(m.title);
  const [newSubrun, setNewSubrun] = useState("");
  const [pickTpl, setPickTpl] = useState("");
  const doneCount = m.runs.filter((r) => r.completed).length;

  return (
    <div
      className="hc-tpl-card"
      style={{
        borderColor: isActiveMultirun ? "var(--accent)" : undefined,
      }}
    >
      <div className="hc-tpl-head">
        {editingTitle ? (
          <input
            value={titleVal}
            onChange={(e) => setTitleVal(e.currentTarget.value)}
            onBlur={() => {
              if (titleVal.trim() && titleVal !== m.title)
                onRenameMultirun(titleVal.trim());
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                (e.currentTarget as HTMLInputElement).blur();
            }}
            autoFocus
          />
        ) : (
          <b onClick={() => setEditingTitle(true)} title="Click to rename">
            {m.title}
          </b>
        )}
        <small>
          {doneCount}/{m.runs.length} done
          {isActiveMultirun ? " · ACTIVE" : ""}
        </small>
        {!isActiveMultirun && m.runs.length > 0 && (
          <button
            style={{ marginLeft: "auto" }}
            onClick={() => {
              const target =
                m.runs.find((r) => !r.completed) || m.runs[0];
              onSelectSubrun(target.id);
            }}
            title="Activate this multirun and load first pending run"
          >
            Activate
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {m.runs.map((r, i) => {
          const isActiveSub = isActiveMultirun && r.id === activeSubrunId;
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                background: isActiveSub ? "var(--panel-2)" : "transparent",
                border: "1px solid var(--border)",
                borderRadius: 6,
              }}
            >
              <input
                type="checkbox"
                checked={r.completed}
                onChange={() => onToggleCompleted(r.id)}
                title="Mark complete"
              />
              <SubrunName
                name={r.name}
                completed={r.completed}
                onRename={(name) => onRenameSubrun(r.id, name)}
              />
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button
                  className="hc-move-btn"
                  onClick={() => onMoveSubrun(r.id, -1)}
                  disabled={i === 0}
                  title="Move up"
                >▲</button>
                <button
                  className="hc-move-btn"
                  onClick={() => onMoveSubrun(r.id, 1)}
                  disabled={i === m.runs.length - 1}
                  title="Move down"
                >▼</button>
                <button
                  onClick={() => onSelectSubrun(r.id)}
                  disabled={isActiveSub}
                  title="Load this run"
                >
                  {isActiveSub ? "Active" : "Load"}
                </button>
                <button
                  className="hc-x"
                  onClick={() => {
                    if (confirm(`Remove run "${r.name}"?`)) onRemoveSubrun(r.id);
                  }}
                  title="Remove run"
                >×</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            placeholder="Add blank run..."
            value={newSubrun}
            onChange={(e) => setNewSubrun(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSubrun.trim()) {
                onAddSubrun(newSubrun.trim());
                setNewSubrun("");
              }
            }}
            style={{
              flex: 1,
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: "6px 10px",
              borderRadius: 6,
            }}
          />
          <button
            onClick={() => {
              if (!newSubrun.trim()) return;
              onAddSubrun(newSubrun.trim());
              setNewSubrun("");
            }}
          >+ Run</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select
            value={pickTpl}
            onChange={(e) => setPickTpl(e.currentTarget.value)}
            className="hc-font-select"
            style={{ flex: 1, minWidth: 160 }}
          >
            <option value="">Add saved run...</option>
            <optgroup label="Built-in">
              {templates
                .filter((t) => !customs.find((c) => c.id === t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </optgroup>
            {customs.length > 0 && (
              <optgroup label="My templates">
                {customs.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            disabled={!pickTpl}
            onClick={() => {
              const t = templates.find((x) => x.id === pickTpl);
              if (!t) return;
              onAddSubrun(t.name, snapshotFromTemplateSplits(t.splits));
              setPickTpl("");
            }}
          >+ Saved</button>
          <button
            onClick={() => onAddSubrun("Current run", snapshotFromCurrentRun())}
          >+ Current</button>
          <button onClick={onRemoveMultirun}>Delete multirun</button>
        </div>
      </div>
    </div>
  );
}

function SubrunName({
  name,
  completed,
  onRename,
}: {
  name: string;
  completed: boolean;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  if (editing) {
    return (
      <input
        value={val}
        onChange={(e) => setVal(e.currentTarget.value)}
        onBlur={() => {
          if (val.trim() && val !== name) onRename(val.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        autoFocus
        style={{
          background: "var(--panel-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          padding: "4px 8px",
          borderRadius: 4,
        }}
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        cursor: "pointer",
        textDecoration: completed ? "line-through" : "none",
        color: completed ? "var(--muted)" : "var(--text)",
      }}
      title="Click to rename"
    >
      {name}
    </span>
  );
}
