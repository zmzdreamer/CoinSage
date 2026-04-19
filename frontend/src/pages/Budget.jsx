import { useEffect, useState } from "react"
import { api } from "../api"

function StatRow({ label, value, valueColor, isLast }) {
  return (
    <>
      <div className="stat-row">
        <span style={{ fontSize: "15px", color: "var(--c-text-2)" }}>{label}</span>
        <span style={{ fontSize: "15px", fontWeight: 600, color: valueColor || "var(--c-text-1)", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
      </div>
      {!isLast && <div className="sep" style={{ marginLeft: "20px" }} />}
    </>
  )
}

export default function Budget() {
  const [amount, setAmount] = useState("")
  const [saved, setSaved] = useState(false)
  const [budget, setBudget] = useState(null)

  useEffect(() => {
    api.getCurrentBudget().then(b => {
      setBudget(b)
      if (b.total_budget > 0) setAmount(String(b.total_budget))
    })
  }, [])

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return
    const today = new Date()
    await api.setBudget({
      amount: Number(amount), period: "monthly",
      year: today.getFullYear(), month: today.getMonth() + 1,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    api.getCurrentBudget().then(setBudget)
  }

  const pct = budget?.total_budget > 0
    ? Math.min((budget.total_spent / budget.total_budget) * 100, 100)
    : 0
  const color = pct < 60 ? "var(--c-green)" : pct < 85 ? "var(--c-orange)" : "var(--c-red)"

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
          本月
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.5px", color: "var(--c-text-1)", marginTop: "4px" }}>
          预算管理
        </h1>
      </div>

      {/* Desktop: two column */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }} className="budget-grid">

        {/* Input card */}
        <div className="card fade-up" style={{ animationDelay: "0ms", overflow: "hidden" }}>
          <div style={{ padding: "24px 24px 20px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: "14px" }}>
              月度总预算（元）
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "24px", fontWeight: 300, color: "var(--c-text-2)" }}>¥</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                onKeyDown={e => e.key === "Enter" && handleSave()}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: "42px", fontWeight: 700, letterSpacing: "-1.5px",
                  color: "var(--c-text-1)", fontFamily: "var(--font)",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
          </div>

          <div className="sep" />

          <button
            onClick={handleSave}
            disabled={!amount || Number(amount) <= 0}
            style={{
              width: "100%", padding: "16px", border: "none",
              background: "transparent", cursor: "pointer",
              fontSize: "15px", fontWeight: 600, fontFamily: "var(--font)",
              color: (amount && Number(amount) > 0) ? "var(--c-blue)" : "var(--c-text-3)",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { if (amount && Number(amount) > 0) e.currentTarget.style.background = "var(--c-fill-2)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
          >
            {saved ? "✓ 已保存" : "保存预算"}
          </button>
        </div>

        {/* Stats card */}
        {budget?.total_budget > 0 && (
          <div className="card fade-up overflow-hidden" style={{ animationDelay: "60ms" }}>
            {/* Mini progress */}
            <div style={{ padding: "20px 24px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-2)" }}>本月概览</p>
                <p style={{ fontSize: "13px", fontWeight: 600, color }}>
                  {pct.toFixed(0)}% 已使用
                </p>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>

            <div className="sep" style={{ margin: "0 24px" }} />

            <StatRow label="月度预算"   value={`¥${budget.total_budget}`} />
            <StatRow label="已花费"     value={`¥${Number(budget.total_spent).toFixed(2)}`}    valueColor="var(--c-red)" />
            <StatRow label="剩余额度"   value={`¥${Number(budget.remaining).toFixed(2)}`}      valueColor={budget.remaining >= 0 ? "var(--c-green)" : "var(--c-red)"} />
            <StatRow label="每日建议"   value={`¥${Number(budget.daily_allowance).toFixed(2)}`} valueColor={budget.daily_allowance >= 0 ? "var(--c-blue)" : "var(--c-red)"} />
            <StatRow label="剩余天数"   value={`${budget.days_left} 天`} isLast />
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .budget-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  )
}
