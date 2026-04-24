const COLORS = {
  success: { bg: "var(--c-green)",  text: "#fff" },
  info:    { bg: "var(--c-blue)",   text: "#fff" },
  error:   { bg: "var(--c-red)",    text: "#fff" },
}

function ToastItem({ toast, onDismiss }) {
  const { bg, text } = COLORS[toast.type] || COLORS.info
  return (
    <div className="toast-item" style={{ background: bg, color: text }}>
      <span style={{ flex: 1, fontSize: "13px", fontWeight: 600 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: "none", border: "none", cursor: "pointer",
                 color: "rgba(255,255,255,0.75)", fontSize: "16px", padding: "0 0 0 10px",
                 lineHeight: 1, flexShrink: 0 }}
        aria-label="关闭"
      >✕</button>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: "fixed",
      top: "calc(env(safe-area-inset-top, 0px) + 68px)",
      right: "16px",
      zIndex: 9999,
      display: "flex", flexDirection: "column", gap: "8px",
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
