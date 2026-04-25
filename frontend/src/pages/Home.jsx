import { useEffect, useState } from "react"
import { api } from "../api"
import AddRecord from "./AddRecord"
import { useToast } from "../ToastContext"

/* ─── Helpers ─── */
function fmt(n) { return n != null ? Number(n).toFixed(2) : "—" }

function progressColor(pct) {
  if (pct < 60) return "var(--c-green)"
  if (pct < 85) return "var(--c-orange)"
  return "var(--c-red)"
}

/* ─── Category color helpers ─── */
function hexToRgb(hex) {
  const h = (hex || "#6b7280").replace("#", "")
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

function paletteFromHex(hex) {
  const [r, g, b] = hexToRgb(hex)
  return {
    accent: hex || "#6b7280",
    bg:     `rgba(${r},${g},${b},0.08)`,
    border: `rgba(${r},${g},${b},0.20)`,
  }
}

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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
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
      <p style={{ fontSize: "12px", color: "var(--c-text-2)", marginTop: "8px" }}>{count} 条记录</p>
    </div>
  )
}

/* ─── 单个分类列 ─── */
function CategoryColumn({ category, items, total, onEdit, onDelete, delay, monthSpent, budgetAmount }) {
  const p = paletteFromHex(category.color)
  const isEmpty = items.length === 0
  const budgetPct = budgetAmount > 0 ? monthSpent / budgetAmount : 0
  const pctColor = budgetPct < 0.6 ? "var(--c-green)" : budgetPct < 0.85 ? "var(--c-orange)" : "var(--c-red)"
  // 记录正在等待二次确认的 id
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  function handleDeleteClick(id) {
    if (pendingDeleteId === id) {
      // 二次点击 → 真正删除
      onDelete(id)
      setPendingDeleteId(null)
    } else {
      setPendingDeleteId(id)
      // 3 秒后自动取消确认状态
      setTimeout(() => setPendingDeleteId(null), 3000)
    }
  }

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

      {/* 月度预算进度条 */}
      {budgetAmount > 0 && (
        <div style={{ padding: "6px 16px 8px", borderBottom: `0.5px solid ${p.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", color: "var(--c-text-3)" }}>月度预算</span>
            <span style={{ fontSize: "10px", color: pctColor, fontWeight: 600 }}>
              ¥{monthSpent.toFixed(0)} / ¥{budgetAmount}
            </span>
          </div>
          <div className="progress-track" style={{ height: "3px" }}>
            <div className="progress-fill" style={{ width: `${Math.min(budgetPct * 100, 100)}%`, background: pctColor }} />
          </div>
        </div>
      )}

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
                <div className="tx-row" style={{
                  display: "flex",
                  alignItems: "center",
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
                  <div className="row-actions" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {/* 编辑 */}
                    <button
                      onClick={() => onEdit(t)}
                      title="编辑"
                      aria-label={`编辑 ${t.note || "支出"}`}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "4px", borderRadius: "6px",
                        color: "var(--c-text-3)", display: "flex", alignItems: "center",
                        flexShrink: 0, transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = p.bg; e.currentTarget.style.color = p.accent }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--c-text-3)" }}
                    >
                      <EditIcon />
                    </button>

                    {/* 删除（二次确认） */}
                    <button
                      onClick={() => handleDeleteClick(t.id)}
                      title={pendingDeleteId === t.id ? "再次点击确认删除" : "删除"}
                      aria-label={`删除 ${t.note || "支出"}`}
                      style={{
                        background: pendingDeleteId === t.id ? "rgba(255,59,48,0.1)" : "none",
                        border: "none", cursor: "pointer",
                        padding: "4px", borderRadius: "6px",
                        color: pendingDeleteId === t.id ? "var(--c-red)" : "var(--c-text-3)",
                        display: "flex", alignItems: "center",
                        flexShrink: 0, transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={e => {
                        if (pendingDeleteId !== t.id) {
                          e.currentTarget.style.background = "rgba(255,59,48,0.08)"
                          e.currentTarget.style.color = "var(--c-red)"
                        }
                      }}
                      onMouseLeave={e => {
                        if (pendingDeleteId !== t.id) {
                          e.currentTarget.style.background = "none"
                          e.currentTarget.style.color = "var(--c-text-3)"
                        }
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
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

/* ─── 骨架屏 ─── */
function HomeSkeleton() {
  const sk = { borderRadius: "var(--r-lg)", background: "var(--c-fill)" }
  return (
    <div>
      <div className="bento" style={{ marginBottom: "20px" }}>
        <div className="skeleton bento-2" style={{ ...sk, height: "160px" }} />
        <div className="skeleton" style={{ ...sk, height: "160px" }} />
        <div className="skeleton" style={{ ...sk, height: "160px" }} />
      </div>
      <div style={{ height: "20px", width: "120px", borderRadius: "6px" }} className="skeleton" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))",
                    gap: "12px", marginTop: "12px" }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ ...sk, height: "200px" }} />
        ))}
      </div>
    </div>
  )
}

/* ─── 分类分栏区域 ─── */
function CategoryGrid({ categories, transactions, onEdit, onDelete, monthSpentByCategory, categoryBudgetMap }) {
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
          onDelete={onDelete}
          delay={140 + i * 30}
          monthSpent={monthSpentByCategory[cat.id] || 0}
          budgetAmount={categoryBudgetMap[cat.id] || 0}
        />
      ))}
    </div>
  )
}

/* ─── Page ─── */
export default function Home({ onAddClick }) {
  const showToast = useToast()
  const [budget, setBudget] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [editingTx, setEditingTx] = useState(null)
  const [monthSpentByCategory, setMonthSpentByCategory] = useState({})
  const [categoryBudgetMap, setCategoryBudgetMap] = useState({})
  const [loadingData, setLoadingData] = useState(true)
  const [recurringDue, setRecurringDue] = useState([])

  async function loadData() {
    setLoadingData(true)
    try {
      const today = new Date()
      const month = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`
      const [budget, txToday, txMonth, catBudgets] = await Promise.all([
        api.getCurrentBudget(),
        api.getTodayTransactions(),
        api.getMonthTransactions(month),
        api.getCategoryBudgets(today.getFullYear(), today.getMonth()+1),
      ])
      setBudget(budget)
      setTransactions(txToday)

      const spent = {}
      txMonth.forEach(t => { spent[t.category_id] = (spent[t.category_id] || 0) + t.amount })
      setMonthSpentByCategory(spent)

      const bmap = {}
      catBudgets.filter(b => b.category_id !== null).forEach(b => { bmap[b.category_id] = b.amount })
      setCategoryBudgetMap(bmap)
    } finally {
      setLoadingData(false)
    }
  }

  async function handleConfirmRecurring(id, name) {
    await api.confirmRecurring(id)
    setRecurringDue(prev => prev.filter(r => r.id !== id))
    loadData()
    showToast(`「${name}」已入账`)
  }

  async function handleDelete(id) {
    await api.deleteTransaction(id)
    loadData()
    showToast("记录已删除")
  }

  useEffect(() => {
    loadData()
    api.getCategories().then(setCategories)
    api.getRecurring().then(list => {
      setRecurringDue(list.filter(r => r.due_this_month && !r.confirmed_this_month))
    })
  }, [])

  const todayTotal = transactions.reduce((s, t) => s + t.amount, 0)
  const pct = budget?.total_budget > 0
    ? Math.min((budget.total_spent / budget.total_budget) * 100, 100)
    : 0

  const now = new Date()
  const dateStr = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })

  if (loadingData && !budget) return <HomeSkeleton />

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

      {/* 周期账单待确认横幅 */}
      {recurringDue.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {recurringDue.map(r => (
            <div key={r.id} className="fade-up" style={{
              display: "flex", alignItems: "center", gap: "12px",
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.20)",
              borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: "8px",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue)" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-1)" }}>{r.name}</p>
                <p style={{ fontSize: "11px", color: "var(--c-text-3)" }}>
                  周期账单 · 每月 {r.day_of_month} 日 · ¥{r.amount}
                </p>
              </div>
              <button
                onClick={() => handleConfirmRecurring(r.id, r.name)}
                style={{
                  background: "var(--c-blue)", color: "#fff", border: "none",
                  borderRadius: "8px", padding: "6px 14px", cursor: "pointer",
                  fontSize: "12px", fontWeight: 600, fontFamily: "var(--font)",
                  flexShrink: 0,
                }}>
                确认入账
              </button>
            </div>
          ))}
        </div>
      )}

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
      {categories.length > 0 && transactions.length === 0 ? (
        <div className="card fade-up" style={{ textAlign: "center", padding: "48px 24px", animationDelay: "140ms" }}>
          <p style={{ fontSize: "36px", marginBottom: "12px" }}>📋</p>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-text-1)", marginBottom: "6px" }}>
            今天还没有支出
          </p>
          <p style={{ fontSize: "13px", color: "var(--c-text-3)", marginBottom: "20px" }}>
            点击右下角 + 记录第一笔，或按 <kbd style={{
              background: "var(--c-fill)", padding: "1px 6px", borderRadius: "4px",
              fontSize: "12px", fontFamily: "var(--font)",
            }}>N</kbd> 快速记账
          </p>
          <button className="btn-primary" onClick={onAddClick}
            style={{ maxWidth: "160px", margin: "0 auto" }}>
            ＋ 记一笔
          </button>
        </div>
      ) : (
        <CategoryGrid
          categories={categories}
          transactions={transactions}
          onEdit={setEditingTx}
          onDelete={handleDelete}
          monthSpentByCategory={monthSpentByCategory}
          categoryBudgetMap={categoryBudgetMap}
        />
      )}

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
