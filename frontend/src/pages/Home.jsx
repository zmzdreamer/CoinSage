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

/* ─── Category color mapping ─── */
const CAT_PALETTE = {
  餐饮: { accent: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
  交通: { accent: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)"  },
  购物: { accent: "#ec4899", bg: "rgba(236,72,153,0.08)",  border: "rgba(236,72,153,0.2)"  },
  娱乐: { accent: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.2)"  },
  医疗: { accent: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)"   },
  其他: { accent: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)" },
}
function palette(name) { return CAT_PALETTE[name] ?? CAT_PALETTE["其他"] }

/* ─── Icons ─── */
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

/* ─── Budget Hero Card ─── */
function BudgetHeroCard({ budget, pct }) {
  const color = progressColor(pct)
  return (
    <div className="card card-hover bento-2 fade-up p-6 md:p-7" style={{ animationDelay: "0ms" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>本月支出</p>
          <p style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, letterSpacing: "-1.5px", color: "var(--c-text-1)", lineHeight: 1.05, marginTop: "4px" }}>
            ¥{fmt(budget?.total_spent)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>月预算</p>
          <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--c-text-1)", marginTop: "4px", letterSpacing: "-0.5px" }}>
            ¥{budget?.total_budget ?? "未设置"}
          </p>
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
        <div>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)" }}>剩余</p>
          <p style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px", color: (budget?.remaining ?? 0) < 0 ? "var(--c-red)" : "var(--c-text-1)" }}>
            ¥{fmt(budget?.remaining)}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)" }}>已使用</p>
          <p style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px", color }}>{pct.toFixed(0)}%</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)" }}>剩余天数</p>
          <p style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px", color: "var(--c-text-1)" }}>{budget?.days_left ?? "—"} 天</p>
        </div>
      </div>
    </div>
  )
}

function DailyCard({ budget }) {
  const a = budget?.daily_allowance ?? 0
  return (
    <div className="card card-hover fade-up p-6" style={{ animationDelay: "60ms" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>每日额度</p>
      <p style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-1px", color: a < 0 ? "var(--c-red)" : "var(--c-green)", marginTop: "8px", lineHeight: 1.1 }}>
        ¥{fmt(a)}
      </p>
      <p style={{ fontSize: "12px", color: "var(--c-text-2)", marginTop: "8px" }}>
        {a < 0 ? "本月超支" : `还有 ${budget?.days_left ?? "—"} 天`}
      </p>
    </div>
  )
}

function TodayTotalCard({ total, count }) {
  return (
    <div className="card card-hover fade-up p-6" style={{ animationDelay: "80ms" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>今日支出</p>
      <p style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-1px", color: "var(--c-text-1)", marginTop: "8px", lineHeight: 1.1 }}>
        ¥{total.toFixed(2)}
      </p>
      <p style={{ fontSize: "12px", color: "var(--c-text-2)", marginTop: "8px" }}>{count} ��记录</p>
    </div>
  )
}

/* ─── 单个分类列 ─── */
function CategoryColumn({ category, items, total, onEdit, delay }) {
  const p = palette(category.name)
  const isEmpty = items.length === 0

  return (
    <div
      className="fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "var(--c-surface)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh-md)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: "180px",
      }}
    >
      {/* 分类头 */}
      <div style={{
        padding: "14px 16px 12px",
        background: p.bg,
        borderBottom: `0.5px solid ${p.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}>
        <span style={{
          fontSize: "13px",
          fontWeight: 700,
          color: p.accent,
          letterSpacing: "0.02em",
        }}>
          {category.name}
        </span>
        <span style={{
          fontSize: "13px",
          fontWeight: 700,
          color: isEmpty ? "var(--c-text-3)" : p.accent,
          fontVariantNumeric: "tabular-nums",
        }}>
          {isEmpty ? "—" : `¥${total.toFixed(2)}`}
        </span>
      </div>

      {/* 消费记录 */}
      <div style={{ flex: 1, padding: "8px 0" }}>
        {isEmpty ? (
          <p style={{
            textAlign: "center",
            fontSize: "12px",
            color: "var(--c-text-3)",
            padding: "24px 12px",
          }}>
            暂无记录
          </p>
        ) : (
          items.map((t, i) => {
            const time = new Date(t.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
            return (
              <div key={t.id}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  gap: "8px",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--c-text-1)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {t.note || "支出"}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginTop: "1px" }}>{time}</p>
                  </div>
                  <span style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--c-red)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}>
                    −¥{Number(t.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={() => onEdit(t)}
                    title="编辑"
                    aria-label={`编辑 ${t.note || "支出"}`}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "6px",
                      color: "var(--c-text-3)",
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = p.bg
                      e.currentTarget.style.color = p.accent
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "none"
                      e.currentTarget.style.color = "var(--c-text-3)"
                    }}
                  >
                    <EditIcon />
                  </button>
                </div>
                {i < items.length - 1 && (
                  <div style={{ height: "0.5px", background: "var(--c-sep)", margin: "0 14px" }} />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 笔数统计 */}
      {!isEmpty && (
        <div style={{
          padding: "8px 14px",
          borderTop: "0.5px solid var(--c-sep)",
          fontSize: "11px",
          color: "var(--c-text-3)",
          fontWeight: 500,
        }}>
          共 {items.length} 笔
        </div>
      )}
    </div>
  )
}

/* ─── 分类分栏区域 ─── */
function CategoryGrid({ categories, transactions, onEdit }) {
  // 按分类分组
  const grouped = {}
  categories.forEach(c => { grouped[c.id] = { items: [], total: 0 } })
  transactions.forEach(t => {
    const g = grouped[t.category_id]
    if (g) { g.items.push(t); g.total += t.amount }
  })

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
      gap: "12px",
      marginTop: "4px",
    }}>
      {categories.map((cat, i) => (
        <CategoryColumn
          key={cat.id}
          category={cat}
          items={grouped[cat.id]?.items ?? []}
          total={grouped[cat.id]?.total ?? 0}
          onEdit={onEdit}
          delay={140 + i * 30}
        />
      ))}
    </div>
  )
}

/* ─── Page ─── */
export default function Home({ onAddClick }) {
  const [budget, setBudget] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [editingTx, setEditingTx] = useState(null)

  function loadData() {
    api.getCurrentBudget().then(setBudget)
    api.getTodayTransactions().then(setTransactions)
  }

  useEffect(() => {
    loadData()
    api.getCategories().then(setCategories)
  }, [])

  const todayTotal = transactions.reduce((s, t) => s + t.amount, 0)
  const pct = budget?.total_budget > 0
    ? Math.min((budget.total_spent / budget.total_budget) * 100, 100)
    : 0

  const now = new Date()
  const dateStr = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
          {dateStr}
        </p>
        <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, letterSpacing: "-0.5px", color: "var(--c-text-1)", marginTop: "4px", lineHeight: 1.1 }}>
          今日概览
        </h1>
      </div>

      {/* 顶部三张概览卡 */}
      <div className="bento" style={{ marginBottom: "20px" }}>
        <BudgetHeroCard budget={budget} pct={pct} />
        <DailyCard budget={budget} />
        <TodayTotalCard total={todayTotal} count={transactions.length} />
      </div>

      {/* 分类分栏标题 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-text-1)" }}>今日分类</h2>
        <span style={{ fontSize: "13px", color: "var(--c-text-3)" }}>
          {categories.length} 个分类
        </span>
      </div>

      {/* 分类列 */}
      <CategoryGrid
        categories={categories}
        transactions={transactions}
        onEdit={setEditingTx}
      />

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
