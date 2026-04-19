import { useState } from "react"
import Home from "./pages/Home"
import AddRecord from "./pages/AddRecord"
import Analysis from "./pages/Analysis"
import Budget from "./pages/Budget"
import "./index.css"

/* ─── SVG Icons ─── */
function Icon({ name, size = 22, color = "currentColor" }) {
  const s = { width: size, height: size }
  if (name === "home") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
  if (name === "home-fill") return (
    <svg {...s} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9" fill="white" stroke="white" strokeWidth="1.5"/>
    </svg>
  )
  if (name === "chart") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  )
  if (name === "chart-fill") return (
    <svg {...s} viewBox="0 0 24 24" fill={color} stroke="none">
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  )
  if (name === "wallet") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="6" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
      <circle cx="7" cy="15" r="1.5" fill={color} stroke="none"/>
    </svg>
  )
  if (name === "wallet-fill") return (
    <svg {...s} viewBox="0 0 24 24" fill={color} stroke="none">
      <rect x="2" y="6" width="20" height="14" rx="2"/>
      <rect x="2" y="10" width="20" height="1" fill="white"/>
      <circle cx="7" cy="15" r="1.5" fill="white"/>
    </svg>
  )
  if (name === "plus") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
  if (name === "logo") return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#0071E3"/>
      <path d="M8 20l4-12 4 12M9.5 16h5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  return null
}

const TABS = [
  { id: "home",     label: "首页",  icon: "home",   iconFill: "home-fill"   },
  { id: "analysis", label: "分析",  icon: "chart",  iconFill: "chart-fill"  },
  { id: "budget",   label: "预算",  icon: "wallet", iconFill: "wallet-fill" },
]

export default function App() {
  const [tab, setTab] = useState("home")
  const [showAdd, setShowAdd] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSaved() {
    setShowAdd(false)
    setTab("home")
    setRefreshKey(k => k + 1)
  }

  return (
    <>
      {/* ── Desktop top nav (md+) ── */}
      <nav className="top-nav hidden md:flex">
        <div className="top-nav-logo">
          <Icon name="logo" size={28} />
          CoinSage
        </div>

        <div className="top-nav-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`top-nav-tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button className="top-nav-cta" onClick={() => setShowAdd(true)}>
          + 记一笔
        </button>
      </nav>

      {/* ── Page content ── */}
      <main className="min-h-dvh bg-[--c-bg]">
        {/* Desktop padding-top, mobile padding-top only */}
        <div className="hidden md:block content-desktop">
          <div className="page-wrap">
            {tab === "home"     && <Home key={refreshKey} onAddClick={() => setShowAdd(true)} />}
            {tab === "analysis" && <Analysis />}
            {tab === "budget"   && <Budget />}
          </div>
        </div>

        <div className="md:hidden content-mobile">
          {tab === "home"     && <Home key={refreshKey} onAddClick={() => setShowAdd(true)} />}
          {tab === "analysis" && <Analysis />}
          {tab === "budget"   && <Budget />}
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="tab-bar md:hidden">
        {TABS.map(t => {
          const active = tab === t.id
          const color = active ? "var(--c-blue)" : "var(--c-text-3)"
          return (
            <button key={t.id} className="tab-item" onClick={() => setTab(t.id)}>
              <Icon name={active ? t.iconFill : t.icon} size={22} color={color} />
              <span className="tab-label" style={{ color }}>{t.label}</span>
            </button>
          )
        })}

        {/* Mobile FAB — shown only on home */}
        {tab === "home" && (
          <button
            onClick={() => setShowAdd(true)}
            aria-label="记一笔"
            style={{
              position: "fixed", bottom: "calc(var(--tab-h) + env(safe-area-inset-bottom) + 16px)", right: "20px",
              width: "52px", height: "52px", borderRadius: "50%",
              background: "var(--c-blue)", border: "none", cursor: "pointer",
              boxShadow: "var(--sh-btn)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
            onMouseUp  ={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <Icon name="plus" size={22} color="white" />
          </button>
        )}
      </nav>

      {/* ── Add Record Modal ── */}
      {showAdd && (
        <AddRecord
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
