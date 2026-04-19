import { useState } from "react"
import Home from "./pages/Home"
import AddRecord from "./pages/AddRecord"
import Analysis from "./pages/Analysis"
import Budget from "./pages/Budget"
import "./index.css"

function TabIcon({ tab, active }) {
  const color = active ? '#0071E3' : '#8E8E93'
  if (tab === 'home') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
        stroke={color} strokeWidth="1.8" strokeLinejoin="round"
        fill={active ? 'rgba(0,113,227,0.12)' : 'none'}
      />
      <path d="M9 21V12h6v9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (tab === 'analysis') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="12" width="4" height="9" rx="1"
        fill={active ? 'rgba(0,113,227,0.12)' : 'none'}
        stroke={color} strokeWidth="1.8"
      />
      <rect x="10" y="7" width="4" height="14" rx="1"
        fill={active ? 'rgba(0,113,227,0.12)' : 'none'}
        stroke={color} strokeWidth="1.8"
      />
      <rect x="17" y="3" width="4" height="18" rx="1"
        fill={active ? 'rgba(0,113,227,0.12)' : 'none'}
        stroke={color} strokeWidth="1.8"
      />
    </svg>
  )
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="2"
        stroke={color} strokeWidth="1.8"
        fill={active ? 'rgba(0,113,227,0.12)' : 'none'}
      />
      <path d="M2 10h20" stroke={color} strokeWidth="1.8"/>
      <circle cx="7" cy="15" r="1.5" fill={color}/>
      <path d="M11 15h6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

const TABS = [
  { id: 'home', label: '首页' },
  { id: 'analysis', label: '分析' },
  { id: 'budget', label: '预算' },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [showAdd, setShowAdd] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-dvh bg-apple-bg max-w-md mx-auto flex flex-col font-apple">
      {/* Page content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '80px' }}>
        {tab === 'home' && (
          <Home key={refreshKey} onAddClick={() => setShowAdd(true)} />
        )}
        {tab === 'analysis' && <Analysis />}
        {tab === 'budget' && <Budget />}
      </div>

      {/* Apple Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-apple-surface flex"
        style={{
          borderTop: '0.5px solid rgba(60,60,67,0.18)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-opacity duration-150 active:opacity-60"
            style={{ minHeight: '49px' }}
          >
            <TabIcon tab={t.id} active={tab === t.id} />
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ color: tab === t.id ? '#0071E3' : '#8E8E93' }}
            >
              {t.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Add Record Modal */}
      {showAdd && (
        <AddRecord
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            setTab('home')
            setRefreshKey(k => k + 1)
          }}
        />
      )}
    </div>
  )
}
