import { useState } from "react"
import { api } from "../api"

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
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">AI 分析</h1>

      <div className="flex gap-2">
        {[["daily", "今日摘要"], ["rebalance", "预算再平衡"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex-1 py-2 rounded-xl text-sm ${mode === id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
      >
        {loading ? "AI 分析中…" : "开始分析"}
      </button>

      {result && (
        <div className="bg-white rounded-2xl p-4 shadow-sm whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
          {result}
        </div>
      )}
    </div>
  )
}
