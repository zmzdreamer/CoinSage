import { useState } from "react"
import { api } from "../api"

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue)" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  )
}

export default function Analysis() {
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState("daily")

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

      {/* Desktop: two column / Mobile: stacked */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }} className="analysis-grid">
        {/* Controls */}
        <div className="card p-6 fade-up" style={{ animationDelay: "0ms" }}>
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
              {result}
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
