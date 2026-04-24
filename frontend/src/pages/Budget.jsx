import { useEffect, useState } from "react"
import { api } from "../api"
import { useToast } from "../ToastContext"

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
  const showToast = useToast()
  const [amount, setAmount] = useState("")
  const [saved, setSaved] = useState(false)
  const [budget, setBudget] = useState(null)
  const [categories, setCategories] = useState([])
  const [catBudgets, setCatBudgets] = useState({})
  const [catSaved, setCatSaved] = useState({})

  useEffect(() => {
    api.getCurrentBudget().then(b => {
      setBudget(b)
      if (b.total_budget > 0) setAmount(String(b.total_budget))
    })
    const today = new Date()
    const [yr, mo] = [today.getFullYear(), today.getMonth() + 1]
    api.getCategories().then(setCategories)
    api.getCategoryBudgets(yr, mo).then(budgets => {
      const map = {}
      budgets.filter(b => b.category_id !== null).forEach(b => {
        map[b.category_id] = String(b.amount)
      })
      setCatBudgets(map)
    })
  }, [])

  async function saveCatBudget(catId) {
    const val = Number(catBudgets[catId])
    if (!val || val <= 0) return
    const today = new Date()
    await api.setBudget({ category_id: catId, amount: val, period: "monthly", year: today.getFullYear(), month: today.getMonth() + 1 })
    setCatSaved(s => ({ ...s, [catId]: true }))
    setTimeout(() => setCatSaved(s => ({ ...s, [catId]: false })), 2000)
    showToast("分类预算已保存")
  }

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return
    const today = new Date()
    await api.setBudget({
      amount: Number(amount), period: "monthly",
      year: today.getFullYear(), month: today.getMonth() + 1,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    showToast("预算已保存")
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
        {/* 分类预算卡片 */}
        {categories.length > 0 && (
          <div className="card fade-up overflow-hidden" style={{ animationDelay: "120ms" }}>
            <div style={{ padding: "20px 24px 12px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: "4px" }}>
                分类预算（可选）
              </p>
            </div>
            {categories.map((cat, i) => (
              <div key={cat.id}>
                <div className="sep" style={{ marginLeft: "20px" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", gap: "12px" }}>
                  {/* 左：彩色圆点 + 分类名 */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                    <span style={{
                      width: "10px", height: "10px", borderRadius: "50%",
                      background: cat.color || "#6b7280", flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "14px", color: "var(--c-text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cat.name}
                    </span>
                  </div>
                  {/* 右：输入框 + 设置按钮 */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                      <span style={{ fontSize: "13px", color: "var(--c-text-3)" }}>¥</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={catBudgets[cat.id] || ""}
                        placeholder="不限"
                        onChange={e => setCatBudgets(s => ({ ...s, [cat.id]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && saveCatBudget(cat.id)}
                        style={{
                          width: "72px", background: "transparent", border: "none", outline: "none",
                          fontSize: "14px", fontWeight: 500, color: "var(--c-text-1)",
                          fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums",
                          textAlign: "left",
                        }}
                      />
                    </div>
                    <button
                      onClick={() => saveCatBudget(cat.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "12px", fontWeight: 600,
                        color: catSaved[cat.id] ? "var(--c-green)" : "var(--c-blue)",
                        fontFamily: "var(--font)", padding: "2px 4px",
                        transition: "color 0.15s",
                      }}
                    >
                      {catSaved[cat.id] ? "✓" : "确认"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
