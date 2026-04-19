import { useEffect, useRef, useState } from "react"
import { api } from "../api"

export default function AddRecord({ onClose, onSaved }) {
  const [categories, setCategories] = useState([])
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    api.getCategories().then(cats => {
      setCategories(cats)
      if (cats.length) setCategoryId(cats[0].id)
    })
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

  const isValid = !!amount && !isNaN(Number(amount)) && Number(amount) > 0

  async function handleSave() {
    if (!isValid || loading) return
    setLoading(true)
    await api.createTransaction({
      amount: Number(amount),
      category_id: categoryId,
      note,
      date: new Date().toISOString().split("T")[0],
    })
    setLoading(false)
    onSaved()
  }

  function handleKey(e) {
    if (e.key === "Escape") onClose()
    if (e.key === "Enter" && isValid) handleSave()
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKey}
    >
      <div className="modal-sheet">
        {/* Pull handle (mobile) / top bar */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--c-sep)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 16px" }}>
          <button
            onClick={onClose}
            style={{ fontSize: "15px", fontWeight: 500, color: "var(--c-blue)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            取消
          </button>
          <h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-text-1)", margin: 0 }}>记一笔</h2>
          <button
            onClick={handleSave}
            disabled={!isValid || loading}
            style={{
              fontSize: "15px", fontWeight: 600,
              color: isValid ? "var(--c-blue)" : "var(--c-text-3)",
              background: "none", border: "none", cursor: isValid ? "pointer" : "default", padding: "4px 0",
              transition: "color 0.15s",
            }}
          >
            {loading ? "保存…" : "完成"}
          </button>
        </div>

        <div className="sep" />

        {/* Amount */}
        <div style={{ padding: "28px 24px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: "16px" }}>
            输入金额
          </p>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 300, color: "var(--c-text-2)" }}>¥</span>
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{
                fontSize: "54px", fontWeight: 700, letterSpacing: "-2px",
                color: "var(--c-text-1)", background: "transparent",
                border: "none", outline: "none", textAlign: "center",
                width: "100%", maxWidth: "220px", fontFamily: "var(--font)",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
        </div>

        <div className="sep" style={{ margin: "0 20px" }} />

        {/* Category */}
        <div style={{ padding: "20px 20px 16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: "12px" }}>
            分类
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                style={{
                  padding: "8px 16px", borderRadius: "20px", border: "none",
                  fontSize: "14px", fontWeight: 500, fontFamily: "var(--font)",
                  cursor: "pointer", transition: "all 0.15s ease",
                  background: categoryId === cat.id ? "var(--c-blue)" : "var(--c-fill)",
                  color:      categoryId === cat.id ? "#fff"          : "var(--c-text-1)",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ background: "var(--c-fill-2)", borderRadius: "var(--r-sm)", padding: "12px 16px" }}>
            <input
              type="text"
              placeholder="添加备注（可选）"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: "100%", background: "transparent", border: "none", outline: "none",
                fontSize: "15px", color: "var(--c-text-1)", fontFamily: "var(--font)",
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "0 20px" }}>
          <button className="btn-primary" onClick={handleSave} disabled={!isValid || loading}>
            {loading ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                  <path d="M12 3a9 9 0 019 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                保存中…
              </>
            ) : "确认记账"}
          </button>
        </div>
      </div>
    </div>
  )
}
