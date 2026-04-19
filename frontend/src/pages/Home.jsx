import { useEffect, useState } from "react"
import { api } from "../api"

function ProgressBar({ pct }) {
  const color = pct < 60 ? '#34C759' : pct < 85 ? '#FF9F0A' : '#FF3B30'
  return (
    <div className="rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(60,60,67,0.12)' }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function TransactionRow({ t, isLast }) {
  const time = new Date(t.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return (
    <>
      <div className="flex justify-between items-center px-5 py-3.5">
        <div>
          <p className="font-medium text-[15px] text-apple-primary">{t.note || '支出'}</p>
          <p className="text-xs mt-0.5 text-apple-secondary">{time}</p>
        </div>
        <p className="text-[15px] font-semibold" style={{ color: '#FF3B30' }}>
          −¥{Number(t.amount).toFixed(2)}
        </p>
      </div>
      {!isLast && <div className="ml-5 apple-separator" />}
    </>
  )
}

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

  const now = new Date()
  const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="min-h-full bg-apple-bg">
      {/* Header */}
      <div className="pt-14 pb-5 px-5">
        <p className="text-xs font-medium text-apple-secondary uppercase tracking-widest">{dateStr}</p>
        <h1 className="text-3xl font-bold mt-1 text-apple-primary" style={{ letterSpacing: '-0.5px' }}>
          今日概览
        </h1>
      </div>

      {/* Budget Card */}
      <div className="mx-4 mb-4 apple-card p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-medium text-apple-secondary uppercase tracking-wider">本月支出</p>
            <p className="mt-1 font-bold text-apple-primary" style={{ fontSize: '36px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              ¥{budget?.total_spent?.toFixed(2) ?? '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-apple-secondary uppercase tracking-wider">月预算</p>
            <p className="mt-1 text-xl font-semibold text-apple-primary">
              ¥{budget?.total_budget ?? '未设置'}
            </p>
          </div>
        </div>

        <ProgressBar pct={pct} />

        <div className="flex justify-between mt-3">
          <div>
            <p className="text-xs text-apple-secondary">剩余</p>
            <p className="text-sm font-semibold mt-0.5 text-apple-primary">
              ¥{budget?.remaining?.toFixed(2) ?? '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-apple-secondary">剩��天数</p>
            <p className="text-sm font-semibold mt-0.5 text-apple-primary">{budget?.days_left ?? '—'} 天</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-apple-secondary">每日额度</p>
            <p
              className="text-sm font-semibold mt-0.5"
              style={{ color: (budget?.daily_allowance ?? 0) < 0 ? '#FF3B30' : '#34C759' }}
            >
              ¥{budget?.daily_allowance?.toFixed(2) ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Today Transactions */}
      <div className="mx-4">
        <div className="flex justify-between items-center mb-3 px-1">
          <h2 className="text-base font-semibold text-apple-primary">今日记录</h2>
          {transactions.length > 0 && (
            <span className="text-sm font-medium" style={{ color: '#0071E3' }}>
              共 ¥{todayTotal.toFixed(2)}
            </span>
          )}
        </div>

        <div className="apple-card overflow-hidden">
          {transactions.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#C7C7CC" strokeWidth="1.5"/>
                <path d="M12 8v4l3 3" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-[15px] font-medium text-apple-primary mt-1">今日暂无记录</p>
              <p className="text-sm text-apple-secondary">点击右下角按钮开始记账</p>
            </div>
          ) : (
            transactions.map((t, i) => (
              <TransactionRow key={t.id} t={t} isLast={i === transactions.length - 1} />
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={onAddClick}
        className="fixed flex items-center justify-center text-white transition-transform duration-150 active:scale-95"
        style={{
          bottom: '80px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#0071E3',
          boxShadow: '0 4px 20px rgba(0,113,227,0.45)',
        }}
        aria-label="记一笔"
      >
        <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  )
}
