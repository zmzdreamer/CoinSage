import { useEffect, useState } from "react"
import { api } from "../api"

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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">月度预算</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <label className="text-sm text-gray-500">本月总预算（元）</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="例如 2000"
          className="w-full text-2xl font-bold border-b-2 border-indigo-500 pb-2 outline-none"
        />
        <button
          onClick={handleSave}
          disabled={!amount}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {saved ? "✓ 已保存" : "保存预算"}
        </button>
      </div>

      {budget?.total_budget > 0 && (
        <div className="bg-indigo-50 rounded-2xl p-4 space-y-1 text-sm text-indigo-900">
          <p>月预算：¥{budget.total_budget}</p>
          <p>已花费：¥{budget.total_spent}</p>
          <p>剩余：¥{budget.remaining}</p>
          <p>每日建议上限：¥{budget.daily_allowance}</p>
        </div>
      )}
    </div>
  )
}
