import { useEffect, useState } from "react"
import { api } from "../api"

export default function AddRecord({ onClose, onSaved }) {
  const [categories, setCategories] = useState([])
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getCategories().then(cats => {
      setCategories(cats)
      if (cats.length) setCategoryId(cats[0].id)
    })
  }, [])

  async function handleSave() {
    if (!amount || isNaN(Number(amount))) return
    setLoading(true)
    await api.createTransaction({
      amount: Number(amount),
      category_id: categoryId,
      note,
      date: new Date().toISOString().split("T")[0],
    })
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">记一笔</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        {/* 金额输入 */}
        <input
          type="number"
          placeholder="金额（元）"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full text-3xl font-bold border-b-2 border-indigo-500 pb-2 outline-none text-center"
          autoFocus
        />

        {/* 分类选择 */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`px-3 py-1 rounded-full text-sm ${categoryId === cat.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 备注 */}
        <input
          type="text"
          placeholder="备注（可选）"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
        />

        <button
          onClick={handleSave}
          disabled={loading || !amount}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  )
}
