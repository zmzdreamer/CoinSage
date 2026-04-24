import { useState, useEffect } from "react"
import { api } from "../api"

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue)" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  )
}

function DonutChart({ chartData }) {
  const r = 56
  const cx = 70
  const cy = 70
  const strokeWidth = 20
  const circumference = 2 * Math.PI * r

  const total = chartData.reduce((sum, d) => sum + d.amount, 0)

  if (total === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0", color: "var(--c-text-3)", fontSize: "14px" }}>
        本月暂无支出
      </div>
    )
  }

  let accumulatedFraction = 0
  const slices = chartData.map((d) => {
    const fraction = d.amount / total
    const dash = fraction * circumference
    const dasharray = `${dash} ${circumference - dash}`
    const dashoffset = circumference * (0.25 - accumulatedFraction)
    accumulatedFraction += fraction
    return { ...d, fraction, dasharray, dashoffset }
  })

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
      {/* SVG Donut */}
      <div style={{ flexShrink: 0 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Background circle */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="var(--c-fill)"
            strokeWidth={strokeWidth}
          />
          {/* Slices */}
          {slices.map((s) => (
            <circle
              key={s.id}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          ))}
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="var(--c-text-3)" fontWeight={500}>
            本月合计
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="16" fill="var(--c-text-1)" fontWeight={700}>
            ¥{total.toFixed(0)}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {slices.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: s.color, flexShrink: 0,
            }} />
            <span style={{ fontSize: "13px", color: "var(--c-text-2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.icon} {s.name}
            </span>
            <span style={{ fontSize: "13px", color: "var(--c-text-1)", fontWeight: 600, flexShrink: 0 }}>
              ¥{s.amount.toFixed(0)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--c-text-3)", flexShrink: 0, minWidth: "36px", textAlign: "right" }}>
              {(s.fraction * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analysis() {
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState("daily")
  const [chartData, setChartData] = useState([])
  const [displayed, setDisplayed] = useState("")

  // Load donut chart data
  useEffect(() => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    Promise.all([api.getCategories(), api.getMonthTransactions(month)]).then(([cats, txs]) => {
      const totals = {}
      txs.forEach((tx) => {
        totals[tx.category_id] = (totals[tx.category_id] || 0) + tx.amount
      })
      const data = cats
        .map((cat) => ({ ...cat, amount: totals[cat.id] || 0 }))
        .filter((cat) => cat.amount > 0)
        .sort((a, b) => b.amount - a.amount)
      setChartData(data)
    })
  }, [])

  // Typewriter animation
  useEffect(() => {
    if (!result) { setDisplayed(""); return }
    setDisplayed("")
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(result.slice(0, i))
      if (i >= result.length) clearInterval(timer)
    }, 12)
    return () => clearInterval(timer)
  }, [result])

  async function run() {
    setLoading(true)
    setResult("")
    const res = mode === "daily" ? await api.getDailySummary() : await api.getRebalance()
    setResult(res.result)
    setLoading(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--c-text-3)", textTransform: "uppercase" }}>
          智能助手
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.5px", color: "var(--c-text-1)", marginTop: "4px" }}>
          AI 分析
        </h1>
      </div>

      {/* Donut Chart Card */}
      <div className="card p-6 fade-up" style={{ animationDelay: "0ms", marginBottom: "16px" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-2)", marginBottom: "16px" }}>本月分类支出</p>
        <DonutChart chartData={chartData} />
      </div>

      {/* Desktop: two column / Mobile: stacked */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }} className="analysis-grid">
        {/* Controls */}
        <div className="card p-6 fade-up" style={{ animationDelay: "60ms" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-text-2)", marginBottom: "16px" }}>分析模式</p>
          <div className="seg" style={{ marginBottom: "20px" }}>
            {[["daily", "今日摘要"], ["rebalance", "预算再平衡"]].map(([id, label]) => (
              <button
                key={id}
                className={`seg-item${mode === id ? " active" : ""}`}
                onClick={() => { setMode(id); setResult("") }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Description */}
          <div style={{
            background: "var(--c-fill-2)", borderRadius: "var(--r-sm)",
            padding: "14px 16px", marginBottom: "20px",
            display: "flex", gap: "12px", alignItems: "flex-start",
          }}>
            <div style={{ marginTop: "2px", flexShrink: 0 }}><SparkIcon /></div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text-1)", marginBottom: "4px" }}>
                {mode === "daily" ? "今日消费摘要" : "预算再平衡建议"}
              </p>
              <p style={{ fontSize: "13px", color: "var(--c-text-2)", lineHeight: 1.55 }}>
                {mode === "daily"
                  ? "AI 分析今天的消费记录，识别支出趋势，给出实用建议。"
                  : "根据本月剩余天数和超支情况，重新规划每日花费上限。"}
              </p>
            </div>
          </div>

          <button className="btn-primary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <svg className="spinner" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"/>
                  <path d="M12 3a9 9 0 019 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                AI 分析中…
              </>
            ) : "开始分析"}
          </button>
        </div>

        {/* Empty state */}
        {!result && !loading && (
          <div className="card fade-up" style={{ padding: "40px 24px", textAlign: "center", animationDelay: "60ms" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>✨</p>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-text-1)", marginBottom: "6px" }}>
              还没有分析结果
            </p>
            <p style={{ fontSize: "13px", color: "var(--c-text-3)" }}>
              选择分析模式，点击「开始分析」获取 AI 建议
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="card fade-up" style={{ animationDelay: "0ms", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <SparkIcon />
              <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-blue)", textTransform: "uppercase" }}>
                AI 分析结果
              </p>
            </div>
            <p style={{ fontSize: "15px", color: "var(--c-text-1)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {displayed}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .analysis-grid {
            grid-template-columns: ${result ? "1fr 1fr" : "1fr"};
          }
        }
      `}</style>
    </div>
  )
}
