import { useState } from "react"
import { api } from "../api"

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
        stroke="#0071E3" strokeWidth="1.5" strokeLinejoin="round"
        fill="rgba(0,113,227,0.1)"
      />
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
    const res = mode === "daily"
      ? await api.getDailySummary()
      : await api.getRebalance()
    setResult(res.result)
    setLoading(false)
  }

  return (
    <div className="min-h-full bg-apple-bg">
      {/* Header */}
      <div className="pt-14 pb-5 px-5">
        <p className="text-xs font-medium text-apple-secondary uppercase tracking-widest">智能助手</p>
        <h1 className="text-3xl font-bold mt-1 text-apple-primary" style={{ letterSpacing: '-0.5px' }}>
          AI 分析
        </h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Segmented control */}
        <div className="apple-segmented">
          {[["daily", "今日摘要"], ["rebalance", "预算再平衡"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setMode(id); setResult("") }}
              className={`apple-segmented-item${mode === id ? ' active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Description card */}
        <div className="apple-card p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5"><SparkleIcon /></div>
            <div>
              <p className="text-[15px] font-medium text-apple-primary mb-1">
                {mode === 'daily' ? '今日消费摘要' : '预算再平衡建议'}
              </p>
              <p className="text-sm text-apple-secondary leading-relaxed">
                {mode === 'daily'
                  ? 'AI 将分析你今天的消费记录，识别支出趋势并给出实用建议。'
                  : '根据本月剩余天数和预算超支情况，AI 将为你重新规划每日花费上限。'}
              </p>
            </div>
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={run}
          disabled={loading}
          className="apple-btn-primary flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                <path d="M12 3a9 9 0 019 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              AI 分析中…
            </>
          ) : (
            '开始分析'
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="apple-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <SparkleIcon />
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: '#0071E3' }}>
                AI 分析结果
              </p>
            </div>
            <p className="text-[15px] text-apple-primary leading-relaxed whitespace-pre-wrap">
              {result}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
