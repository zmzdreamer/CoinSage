import { useState } from "react"
import Home from "./pages/Home"
import AddRecord from "./pages/AddRecord"
import Analysis from "./pages/Analysis"
import Budget from "./pages/Budget"
import "./index.css"

const TABS = [
  { id: "home", label: "首页" },
  { id: "analysis", label: "分析" },
  { id: "budget", label: "预算" },
]

export default function App() {
  const [tab, setTab] = useState("home")
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === "home" && <Home onAddClick={() => setShowAdd(true)} />}
        {tab === "analysis" && <Analysis />}
        {tab === "budget" && <Budget />}
      </div>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm ${tab === t.id ? "text-indigo-600 font-medium" : "text-gray-400"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* 记账弹窗 */}
      {showAdd && <AddRecord onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setTab("home") }} />}
    </div>
  )
}

