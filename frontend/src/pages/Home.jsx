import { useEffect, useState } from "react"
import { api } from "../api"

/* ─── Helpers ─── */
function fmt(n) { return n != null ? Number(n).toFixed(2) : "—" }

function progressColor(pct) {
  if (pct < 60)  return "var(--c-green)"
  if (pct < 85)  return "var(--c-orange)"
  return "var(--c-red)"
}

/* ─── Sub-components ─── */
function BudgetHeroCard({ budget, pct }) {
  const color = progressColor(pct)
  return (
    <div className="card card-hover bento-2 fade-up p-6 md:p-8" style={{ animationDelay: "0ms" }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
            本月支出
          </p>
          <p style={{ fontSize: "clamp(36px, 5vw, 54px)", fontWeight: 700, letterSpacing: "-1.5px", color: "var(--c-text-1)", lineHeight: 1.05, marginTop: "6px" }}>
            ¥{fmt(budget?.total_spent)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
            月预算
          </p>
          <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--c-text-1)", marginTop: "6px", letterSpacing: "-0.5px" }}>
            ¥{budget?.total_budget ?? "未设置"}
          </p>
        </div>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>

      <div className="flex justify-between items-center mt-4">
        <div>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "2px" }}>剩余</p>
          <p style={{ fontSize: "17px", fontWeight: 600, color: (budget?.remaining ?? 0) < 0 ? "var(--c-red)" : "var(--c-text-1)" }}>
            ¥{fmt(budget?.remaining)}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "2px" }}>已使用</p>
          <p style={{ fontSize: "17px", fontWeight: 600, color }}>
            {pct.toFixed(0)}%
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "2px" }}>剩余天数</p>
          <p style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-text-1)" }}>
            {budget?.days_left ?? "—"} 天
          </p>
        </div>
      </div>
    </div>
  )
}

function DailyCard({ budget }) {
  const allowance = budget?.daily_allowance ?? 0
  const isOver = allowance < 0
  return (
    <div className="card card-hover fade-up p-6" style={{ animationDelay: "60ms" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
        每日额度
      </p>
      <p style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-1px", color: isOver ? "var(--c-red)" : "var(--c-green)", marginTop: "8px", lineHeight: 1.1 }}>
        ¥{fmt(allowance)}
      </p>
      <p style={{ fontSize: "13px", color: "var(--c-text-2)", marginTop: "8px" }}>
        {isOver ? "本月已超支" : `还有 ${budget?.days_left ?? "—"} 天`}
      </p>
    </div>
  )
}

function TodayTotalCard({ total, count }) {
  return (
    <div className="card card-hover fade-up p-6" style={{ animationDelay: "80ms" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
        今日支出
      </p>
      <p style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-1px", color: "var(--c-text-1)", marginTop: "8px", lineHeight: 1.1 }}>
        ¥{total.toFixed(2)}
      </p>
      <p style={{ fontSize: "13px", color: "var(--c-text-2)", marginTop: "8px" }}>
        {count} 笔记录
      </p>
    </div>
  )
}

function TransactionList({ transactions }) {
  if (transactions.length === 0) return (
    <div className="card fade-up" style={{ animationDelay: "120ms", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-3)" strokeWidth="1.2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 8v4l3 3" strokeLinecap="round"/>
      </svg>
      <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--c-text-1)" }}>今日暂无记录</p>
      <p style={{ fontSize: "13px", color: "var(--c-text-2)" }}>点击「记一笔」开始记账</p>
    </div>
  )

  return (
    <div className="card bento-3 fade-up overflow-hidden" style={{ animationDelay: "120ms" }}>
      <div style={{ padding: "20px 24px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-text-1)" }}>今日记录</p>
        <p style={{ fontSize: "13px", color: "var(--c-text-2)" }}>{transactions.length} 笔</p>
      </div>

      {transactions.map((t, i) => {
        const time = new Date(t.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
        return (
          <div key={t.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 24px" }}>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--c-text-1)" }}>{t.note || "支出"}</p>
                <p style={{ fontSize: "12px", color: "var(--c-text-3)", marginTop: "2px" }}>{time}</p>
              </div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-red)", fontVariantNumeric: "tabular-nums" }}>
                −¥{Number(t.amount).toFixed(2)}
              </p>
            </div>
            {i < transactions.length - 1 && <div className="sep" style={{ marginLeft: "24px" }} />}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Page ─── */
export default function Home({ onAddClick }) {
  const [budget, setBudget] = useState(null)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    api.getCurrentBudget().then(setBudget)
    api.getTodayTransactions().then(setTransactions)
  }, [])

  const todayTotal = transactions.reduce((s, t) => s + t.amount, 0)
  const pct = budget?.total_budget > 0
    ? Math.min((budget.total_spent / budget.total_budget) * 100, 100)
    : 0

  const now = new Date()
  const dateStr = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
          {dateStr}
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.5px", color: "var(--c-text-1)", marginTop: "4px", lineHeight: 1.1 }}>
          今日概览
        </h1>
      </div>

      {/* Bento grid */}
      <div className="bento">
        <BudgetHeroCard budget={budget} pct={pct} />
        <DailyCard budget={budget} />
        <TodayTotalCard total={todayTotal} count={transactions.length} />
        <TransactionList transactions={transactions} />
      </div>

      {/* Mobile: only show FAB via App.jsx — desktop: no FAB (use top nav button) */}
    </div>
  )
}
