import { useEffect, useState } from "react"
import { api } from "../api"

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

function fmt(n) { return Number(n).toFixed(2) }

function prevMonth(ym) {
  const [y, m] = ym.split("-").map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
}

function nextMonth(ym) {
  const [y, m] = ym.split("-").map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
}

function currentYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`
}

function ChevronIcon({ dir }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left"
        ? <path d="M15 18l-6-6 6-6" />
        : <path d="M9 18l6-6-6-6" />}
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function History() {
  const [month, setMonth] = useState(currentYM)
  const [transactions, setTransactions] = useState([])
  const [categoryMap, setCategoryMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const isCurrentMonth = month === currentYM()

  useEffect(() => {
    api.getCategories().then(cats => {
      const m = {}
      cats.forEach(c => { m[c.id] = c.name })
      setCategoryMap(m)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getMonthTransactions(month)
      .then(setTransactions)
      .finally(() => setLoading(false))
  }, [month])

  async function handleExport() {
    setExporting(true)
    try { await api.exportTransactions(month) }
    finally { setExporting(false) }
  }

  // 按日期分组
  const grouped = {}
  transactions.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = []
    grouped[t.date].push(t)
  })
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const monthTotal = transactions.reduce((s, t) => s + t.amount, 0)

  const [year, mon] = month.split("-")

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
          历史账单
        </p>
        <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, letterSpacing: "-0.5px", color: "var(--c-text-1)", marginTop: "4px", lineHeight: 1.1 }}>
          {year}年{Number(mon)}月
        </h1>
      </div>

      {/* Month nav + export */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            onClick={() => setMonth(prevMonth(month))}
            style={{ background: "var(--c-fill)", border: "none", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", color: "var(--c-text-1)", display: "flex", alignItems: "center" }}
          >
            <ChevronIcon dir="left" />
          </button>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-text-1)", padding: "0 8px", minWidth: "80px", textAlign: "center" }}>
            {year}/{mon}
          </span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            disabled={isCurrentMonth}
            style={{ background: "var(--c-fill)", border: "none", borderRadius: "8px", padding: "6px 10px", cursor: isCurrentMonth ? "default" : "pointer", color: isCurrentMonth ? "var(--c-text-3)" : "var(--c-text-1)", display: "flex", alignItems: "center", opacity: isCurrentMonth ? 0.4 : 1 }}
          >
            <ChevronIcon dir="right" />
          </button>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || transactions.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "var(--c-fill)", border: "none", borderRadius: "8px",
            padding: "7px 14px", cursor: "pointer", fontSize: "13px",
            fontWeight: 500, color: "var(--c-blue)", fontFamily: "var(--font)",
            opacity: transactions.length === 0 ? 0.4 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <DownloadIcon />
          {exporting ? "导出中…" : "导出 CSV"}
        </button>
      </div>

      {/* 月度汇总 */}
      {!loading && transactions.length > 0 && (
        <div className="card fade-up p-6" style={{ animationDelay: "0ms", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>本月合计</p>
            <p style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-1px", color: "var(--c-red)", marginTop: "4px" }}>
              ¥{fmt(monthTotal)}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase" }}>笔数</p>
            <p style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-1px", color: "var(--c-text-1)", marginTop: "4px" }}>
              {transactions.length}
            </p>
          </div>
        </div>
      )}

      {/* 流水列表 */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "120px", borderRadius: "var(--r-lg)" }} />
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="card fade-up" style={{ textAlign: "center", padding: "60px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>📭</p>
          <p style={{ fontSize: "15px", color: "var(--c-text-2)", fontWeight: 500 }}>本月暂无记录</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sortedDates.map((date, di) => {
            const items = grouped[date]
            const dayTotal = items.reduce((s, t) => s + t.amount, 0)
            return (
              <div key={date} className="card fade-up overflow-hidden" style={{ animationDelay: `${di * 30}ms` }}>
                {/* 日期标题 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--c-sep)" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-2)" }}>
                    {formatDayLabel(date)}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-red)", fontVariantNumeric: "tabular-nums" }}>
                    −¥{fmt(dayTotal)}
                  </span>
                </div>
                {/* 记录行 */}
                {items.map((t, i) => {
                  const catName = categoryMap[t.category_id] || "其他"
                  const time = new Date(t.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
                  return (
                    <div key={t.id}>
                      <div style={{ display: "flex", alignItems: "center", padding: "11px 16px", gap: "10px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--c-text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.note || "支出"}
                          </p>
                          <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginTop: "2px" }}>
                            {catName} · {time}
                          </p>
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-red)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          −¥{fmt(t.amount)}
                        </span>
                      </div>
                      {i < items.length - 1 && (
                        <div style={{ height: "0.5px", background: "var(--c-sep)", margin: "0 16px" }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
