import { useEffect, useState } from "react"
import { api } from "../api"

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

  return (
    <div className="p-4 space-y-4">
      {/* 月度预算卡片 */}
      <div className="bg-indigo-600 text-white rounded-2xl p-5">
        <p className="text-sm opacity-80">本月支出 / 预算</p>
        <p className="text-3xl font-bold mt-1">
          ¥{budget?.total_spent ?? "—"}
          <span className="text-lg opacity-70"> / ¥{budget?.total_budget ?? "—"}</span>
        </p>
        <div className="mt-3 bg-indigo-400 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs mt-2 opacity-70">
          剩余 ¥{budget?.remaining ?? "—"} · 还有 {budget?.days_left ?? "—"} 天 · 每日可花 ¥{budget?.daily_allowance ?? "—"}
        </p>
      </div>

      {/* 今日记录 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-gray-700">今日记录</h2>
          <span className="text-sm text-gray-500">合计 ¥{todayTotal.toFixed(2)}</span>
        </div>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">今日暂无记录</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="flex justify-between items-center bg-white rounded-xl p-3 shadow-sm">
                <span className="text-gray-700">{t.note || "无备注"}</span>
                <span className="font-medium text-gray-900">¥{Number(t.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快速记账按钮 */}
      <button
        onClick={onAddClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center"
      >
        +
      </button>
    </div>
  )
}
