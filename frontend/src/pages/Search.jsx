import { useEffect, useRef, useState } from "react"
import { api } from "../api"

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]
function fmt(n) { return Number(n).toFixed(2) }
function dayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getMonth()+1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`
}

export default function Search({ onClose }) {
  const inputRef = useRef(null)
  const [q, setQ]                   = useState("")
  const [categories, setCategories] = useState([])
  const [selCat, setSelCat]         = useState(null)
  const [amtMin, setAmtMin]         = useState("")
  const [amtMax, setAmtMax]         = useState("")
  const [dateFrom, setDateFrom]     = useState("")
  const [dateTo, setDateTo]         = useState("")
  const [results, setResults]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)

  const debouncedQ = useDebounce(q)

  useEffect(() => {
    api.getCategories().then(setCategories)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    const hasFilter = debouncedQ || selCat || amtMin || amtMax || dateFrom || dateTo
    if (!hasFilter) { setResults([]); setSearched(false); return }

    setLoading(true)
    api.searchTransactions({
      q: debouncedQ || undefined,
      category_id: selCat || undefined,
      amount_min: amtMin ? Number(amtMin) : undefined,
      amount_max: amtMax ? Number(amtMax) : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
      .then(r => { setResults(r); setSearched(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedQ, selCat, amtMin, amtMax, dateFrom, dateTo])

  function clearAll() {
    setQ(""); setSelCat(null); setAmtMin(""); setAmtMax("")
    setDateFrom(""); setDateTo(""); setResults([]); setSearched(false)
    inputRef.current?.focus()
  }

  const hasFilter = q || selCat || amtMin || amtMax || dateFrom || dateTo

  const inputBase = {
    background: "var(--c-fill-2)", border: "1px solid var(--c-sep)",
    borderRadius: "var(--r-sm)", padding: "8px 12px",
    fontSize: "14px", color: "var(--c-text-1)", fontFamily: "var(--font)",
    outline: "none", width: "100%",
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "var(--c-bg)",
      display: "flex", flexDirection: "column",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
    }}>
      {/* 顶栏 */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 16px 12px" }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: "8px",
          background: "var(--c-fill)", borderRadius: "var(--r-md)", padding: "8px 14px",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-3)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索备注关键词…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: "15px", color: "var(--c-text-1)", fontFamily: "var(--font)",
            }}
          />
          {q && (
            <button onClick={() => setQ("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-3)", fontSize: "16px", padding: 0, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-blue)", fontSize: "15px", fontWeight: 500, fontFamily: "var(--font)", whiteSpace: "nowrap" }}>
          取消
        </button>
      </div>

      <div className="sep" />

      {/* 过滤条件 */}
      <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--c-sep)" }}>
        {/* 分类筛选 */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
          <button
            onClick={() => setSelCat(null)}
            style={{
              padding: "5px 12px", borderRadius: "20px", border: "none",
              fontSize: "12px", fontWeight: 500, fontFamily: "var(--font)", cursor: "pointer",
              background: !selCat ? "var(--c-blue)" : "var(--c-fill)",
              color: !selCat ? "#fff" : "var(--c-text-2)",
              transition: "all 0.15s",
            }}>
            全部
          </button>
          {categories.map(c => (
            <button key={c.id}
              onClick={() => setSelCat(selCat === c.id ? null : c.id)}
              style={{
                padding: "5px 12px", borderRadius: "20px", border: "none",
                fontSize: "12px", fontWeight: 500, fontFamily: "var(--font)", cursor: "pointer",
                background: selCat === c.id ? c.color : "var(--c-fill)",
                color: selCat === c.id ? "#fff" : "var(--c-text-2)",
                transition: "all 0.15s",
              }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* 金额 + 日期 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>最低金额</p>
            <input type="number" inputMode="decimal" placeholder="¥ 0"
              value={amtMin} onChange={e => setAmtMin(e.target.value)} style={inputBase} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>最高金额</p>
            <input type="number" inputMode="decimal" placeholder="¥ 不限"
              value={amtMax} onChange={e => setAmtMax(e.target.value)} style={inputBase} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>开始日期</p>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputBase} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "4px", fontWeight: 600 }}>结束日期</p>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputBase} />
          </div>
        </div>

        {hasFilter && (
          <button onClick={clearAll}
            style={{ marginTop: "8px", background: "none", border: "none", cursor: "pointer",
                     color: "var(--c-red)", fontSize: "12px", fontWeight: 500, fontFamily: "var(--font)", padding: 0 }}>
            清除所有条件
          </button>
        )}
      </div>

      {/* 结果列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "60px", borderRadius: "var(--r-md)" }} />
            ))}
          </div>
        ) : !searched ? (
          <div style={{ textAlign: "center", paddingTop: "60px", color: "var(--c-text-3)" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</p>
            <p style={{ fontSize: "14px" }}>输入关键词或选择条件开始搜索</p>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "60px", color: "var(--c-text-3)" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>📭</p>
            <p style={{ fontSize: "14px" }}>没有找到匹配的记录</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "12px", color: "var(--c-text-3)", marginBottom: "10px", fontWeight: 600 }}>
              找到 {results.length} 条记录
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {results.map(t => (
                <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: "10px" }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                    background: t.category_color || "#6b7280",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--c-text-1)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.note || "支出"}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginTop: "2px" }}>
                      {t.category_name || "其他"} · {dayLabel(t.date)}
                    </p>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-red)",
                                 fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    −¥{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
