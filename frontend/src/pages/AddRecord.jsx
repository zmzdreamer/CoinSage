import { useEffect, useRef, useState } from "react"
import { api } from "../api"

export default function AddRecord({ onClose, onSaved }) {
  const [categories, setCategories] = useState([])
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    api.getCategories().then(cats => {
      setCategories(cats)
      if (cats.length) setCategoryId(cats[0].id)
    })
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

  async function handleSave() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return
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

  const isValid = amount && !isNaN(Number(amount)) && Number(amount) > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md mx-auto bg-apple-surface"
        style={{
          borderRadius: '20px 20px 0 0',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
        }}
      >
        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(60,60,67,0.18)' }} />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-2 pb-4">
          <button
            onClick={onClose}
            className="text-sm font-medium transition-opacity active:opacity-50"
            style={{ color: '#0071E3' }}
          >
            取消
          </button>
          <h2 className="text-[17px] font-semibold text-apple-primary">记一笔</h2>
          <button
            onClick={handleSave}
            disabled={!isValid || loading}
            className="text-sm font-semibold transition-opacity active:opacity-50 disabled:opacity-30"
            style={{ color: '#0071E3' }}
          >
            {loading ? '保存…' : '完成'}
          </button>
        </div>

        <div className="apple-separator" />

        {/* Amount display */}
        <div className="px-6 pt-7 pb-5 text-center">
          <p className="text-xs font-medium text-apple-secondary uppercase tracking-widest mb-4">输入金额</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-light" style={{ color: '#6E6E73' }}>¥</span>
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-transparent outline-none text-center text-apple-primary"
              style={{ fontSize: '52px', fontWeight: 700, letterSpacing: '-2px', width: '100%', maxWidth: '220px' }}
            />
          </div>
        </div>

        <div className="apple-separator mx-5 mb-5" />

        {/* Category pills */}
        <div className="px-5 mb-5">
          <p className="text-xs font-medium text-apple-secondary uppercase tracking-widest mb-3">选择分类</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 active:scale-95"
                style={
                  categoryId === cat.id
                    ? { background: '#0071E3', color: '#FFFFFF' }
                    : { background: 'rgba(116,116,128,0.12)', color: '#1D1D1F' }
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Note input */}
        <div className="mx-5 mb-5">
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(118,118,128,0.08)' }}>
            <input
              type="text"
              placeholder="添加备注（可选）"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-transparent outline-none text-[15px] text-apple-primary"
              style={{ '::placeholder': { color: '#C7C7CC' } }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="px-5">
          <button
            onClick={handleSave}
            disabled={!isValid || loading}
            className="apple-btn-primary"
          >
            {loading ? '保存中…' : '确认记���'}
          </button>
        </div>
      </div>
    </div>
  )
}
