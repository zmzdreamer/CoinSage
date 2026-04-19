import { useEffect, useState } from "react"
import { api } from "../api"

function StatRow({ label, value, valueColor }) {
  return (
    <div className="flex justify-between items-center px-5 py-4">
      <span className="text-[15px] text-apple-secondary">{label}</span>
      <span className="text-[15px] font-semibold" style={{ color: valueColor || '#1D1D1F' }}>
        {value}
      </span>
    </div>
  )
}

export default function Budget() {
  const [amount, setAmount] = useState("")
  const [saved, setSaved] = useState(false)
  const [budget, setBudget] = useState(null)

  useEffect(() => {
    api.getCurrentBudget().then(b => {
      setBudget(b)
      if (b.total_budget > 0) setAmount(String(b.total_budget))
    })
  }, [])

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return
    const today = new Date()
    await api.setBudget({
      amount: Number(amount),
      period: "monthly",
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    api.getCurrentBudget().then(setBudget)
  }

  const pct = budget?.total_budget > 0
    ? Math.min((budget.total_spent / budget.total_budget) * 100, 100)
    : 0
  const progressColor = pct < 60 ? '#34C759' : pct < 85 ? '#FF9F0A' : '#FF3B30'

  return (
    <div className="min-h-full bg-apple-bg">
      {/* Header */}
      <div className="pt-14 pb-5 px-5">
        <p className="text-xs font-medium text-apple-secondary uppercase tracking-widest">本月</p>
        <h1 className="text-3xl font-bold mt-1 text-apple-primary" style={{ letterSpacing: '-0.5px' }}>
          预算管理
        </h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Budget input card */}
        <div className="apple-card overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <label className="text-xs font-medium text-apple-secondary uppercase tracking-widest block mb-3">
              月度总预算（元���
            </label>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-light text-apple-secondary">¥</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent outline-none text-apple-primary font-bold"
                style={{ fontSize: '40px', letterSpacing: '-1.5px' }}
              />
            </div>
          </div>

          <div className="apple-separator" />

          <button
            onClick={handleSave}
            disabled={!amount || Number(amount) <= 0}
            className="w-full py-4 text-[15px] font-semibold transition-all duration-150 active:opacity-60 disabled:opacity-30"
            style={{ color: '#0071E3' }}
          >
            {saved ? '✓ 已保存' : '保存预算'}
          </button>
        </div>

        {/* Budget stats */}
        {budget?.total_budget > 0 && (
          <div className="apple-card overflow-hidden">
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs font-medium text-apple-secondary uppercase tracking-widest mb-3">本月概览</p>
              {/* Mini progress bar */}
              <div className="rounded-full overflow-hidden mb-1" style={{ height: '4px', background: 'rgba(60,60,67,0.12)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: progressColor }}
                />
              </div>
              <p className="text-right text-xs" style={{ color: progressColor }}>
                {pct.toFixed(0)}% 已使用
              </p>
            </div>

            <div className="apple-separator mx-5" />
            <StatRow label="月度预算" value={`¥${budget.total_budget}`} />

            <div className="apple-separator mx-5" />
            <StatRow
              label="已花费"
              value={`¥${budget.total_spent.toFixed(2)}`}
              valueColor="#FF3B30"
            />

            <div className="apple-separator mx-5" />
            <StatRow
              label="剩余额度"
              value={`¥${budget.remaining.toFixed(2)}`}
              valueColor={budget.remaining >= 0 ? '#34C759' : '#FF3B30'}
            />

            <div className="apple-separator mx-5" />
            <StatRow
              label="每日建议上限"
              value={`¥${budget.daily_allowance.toFixed(2)}`}
              valueColor={budget.daily_allowance >= 0 ? '#0071E3' : '#FF3B30'}
            />

            <div className="apple-separator mx-5" />
            <StatRow label="剩余天数" value={`${budget.days_left} 天`} />
          </div>
        )}
      </div>
    </div>
  )
}
