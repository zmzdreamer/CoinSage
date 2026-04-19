import { useEffect, useState } from "react"
import { api } from "../api"
import AddRecord from "./AddRecord"

/* ─── Helpers ─── */
function fmt(n) { return n != null ? Number(n).toFixed(2) : "—" }

function progressColor(pct) {
  if (pct < 60) return "var(--c-green)"
  if (pct < 85) return "var(--c-orange)"
  return "var(--c-red)"
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="var(--c-text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

/* ─── Sub-components ─── */
function BudgetHeroCard({ budget, pct }) {
  const color = progressColor(pct)
  return (
    <div className="card card-hover bento-2 fade-up p-6 md:p-8" style={{ animationDelay: "0ms" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
        <div>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "2px" }}>剩余</p>
          <p style={{ fontSize: "17px", fontWeight: 600, color: (budget?.remaining ?? 0) < 0 ? "var(--c-red)" : "var(--c-text-1)" }}>
            ¥{fmt(budget?.remaining)}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "2px" }}>已使用</p>
          <p style={{ fontSize: "17px", fontWeight: 600, color }}>{pct.toFixed(0)}%</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "2px" }}>剩余天数</p>
          <p style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-text-1)" }}>{budget?.days_left ?? "—"} 天</p>
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
        {isOver ? "本月���超支" : `还有 ${budget?.days_left ?? "—"} 天`}
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
      <p style={{ fontSize: "13px", color: "var(--c-text-2)", marginTop: "8px" }}>{count} 笔记录</p>
    </div>
  )
}

/* 分类色块映射 */
const CAT_COLORS = {
  餐饮: { bg: "rgba(249,115,22,0.1)", text: "#f97316" },
  交通: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6" },
  购物: { bg: "rgba(236,72,153,0.1)", text: "#ec4899" },
  娱乐: { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  医疗: { bg: "rgba(239,68,68,0.1)",  text: "#ef4444" },
  其他: { bg: "rgba(107,114,128,0.1)","text": "#6b7280" },
}

function CategoryBadge({ name }) {
  const c = CAT_COLORS[name] ?? CAT_COLORS["其他"]
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: 600,
      background: c.bg,
      color: c.text,
      letterSpacing: "0.02em",
    }}>
      {name}
    </span>
  )
}

function TransactionList({ transactions, categoryMap, onEdit }) {
  if (transactions.length === 0) return (
    <div className="card bento-3 fade-up" style={{ animationDelay: "120ms", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-3)" strokeWidth="1.2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 8v4l3 3" strokeLinecap="round"/>
      </svg>
      <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--c-text-1)" }}>今日暂无记录</p>
      <p style={{ fontSize: "13px", color: "var(--c-text-2)" }}>点击「＋」开始记账</p>
    </div>
  )

  return (
    <div className="card bento-3 fade-up overflow-hidden" style={{ animationDelay: "120ms" }}>
      {/* 表头 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        gap: "0 16px",
        padding: "14px 20px 10px",
        borderBottom: "0.5px solid var(--c-sep)",
      }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>备注</span>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>分类</span>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>金额</span>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>操作</span>
      </div>

      {transactions.map((t, i) => {
        const catName = categoryMap[t.category_id] ?? "其他"
        const time = new Date(t.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
        return (
          <div key={t.id}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              gap: "0 16px",
              alignItems: "center",
              padding: "13px 20px",
            }}>
              {/* 备注 + 时间 */}
              <div>
                <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--c-text-1)" }}>{t.note || "支出"}</p>
                <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginTop: "2px" }}>{time}</p>
              </div>

              {/* 分类 */}
              <CategoryBadge name={catName} />

              {/* 金额 */}
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-red)", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                −¥{Number(t.amount).toFixed(2)}
              </p>

              {/* 编辑按钮 */}
              <button
                onClick={() => onEdit(t)}
                title="编辑"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "6px", borderRadius: "8px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--c-fill)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
                aria-label={`编辑 ${t.note || "支出"}`}
              >
                <EditIcon />
              </button>
            </div>
            {i < transactions.length - 1 && <div className="sep" style={{ marginLeft: "20px" }} />}
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
  const [categoryMap, setCategoryMap] = useState({})   // id → name
  const [editingTx, setEditingTx] = useState(null)     // 当前被编辑的记录

  function loadData() {
    api.getCurrentBudget().then(setBudget)
    api.getTodayTransactions().then(setTransactions)
  }

  useEffect(() => {
    loadData()
    api.getCategories().then(cats => {
      const map = {}
      cats.forEach(c => { map[c.id] = c.name })
      setCategoryMap(map)
    })
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
        <TransactionList
          transactions={transactions}
          categoryMap={categoryMap}
          onEdit={setEditingTx}
        />
      </div>

      {/* 编辑弹窗 */}
      {editingTx && (
        <AddRecord
          editData={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={() => { setEditingTx(null); loadData() }}
        />
      )}
    </div>
  )
}
