import { useEffect, useState } from "react";

type ConfirmOpts = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type Pending = ConfirmOpts & { resolve: (v: boolean) => void };

let setter: ((p: Pending | null) => void) | null = null;

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  if (!setter) return Promise.resolve(window.confirm(opts.message));
  return new Promise((resolve) => {
    setter!({ ...opts, resolve });
  });
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    setter = setPending;
    return () => {
      setter = null;
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
      else if (e.key === "Enter") finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  function finish(v: boolean) {
    if (!pending) return;
    pending.resolve(v);
    setPending(null);
  }

  if (!pending) return null;

  return (
    <div
      onClick={() => finish(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 22,
          minWidth: 340,
          maxWidth: 480,
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          color: "var(--text)",
        }}
      >
        {pending.title && (
          <div
            style={{
              fontWeight: 700,
              fontSize: 17,
              marginBottom: 10,
              color: pending.danger ? "var(--bad)" : "var(--text)",
            }}
          >
            {pending.title}
          </div>
        )}
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--muted)",
            marginBottom: 20,
            whiteSpace: "pre-wrap",
          }}
        >
          {pending.message}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => finish(false)}>
            {pending.cancelText || "Cancel"}
          </button>
          <button
            onClick={() => finish(true)}
            autoFocus
            style={{
              background: pending.danger ? "var(--bad)" : "var(--accent)",
              color: "#000",
              fontWeight: 700,
              border: "none",
            }}
          >
            {pending.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
