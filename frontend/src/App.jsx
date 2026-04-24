import { useState, useEffect } from "react"
import { useAuth } from "./AuthContext"
import Home from "./pages/Home"
import History from "./pages/History"
import AddRecord from "./pages/AddRecord"
import Analysis from "./pages/Analysis"
import Budget from "./pages/Budget"
import Categories from "./pages/Categories"
import AISettings from "./pages/AISettings"
import Search from "./pages/Search"
import Login from "./pages/Login"
import "./index.css"

/* ─── SVG Icons ─── */
function Icon({ name, size = 22, color = "currentColor" }) {
  const s = { width: size, height: size }
  if (name === "home") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
  if (name === "home-fill") return (
    <svg {...s} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22" fill="white" stroke="white" strokeWidth="1.5"/>
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
  if (name === "list") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  )
  if (name === "list-fill") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
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
  if (name === "logout") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
  return null
}

const TABS = [
  { id: "home",     label: "首页",  icon: "home",   iconFill: "home-fill"   },
  { id: "history",  label: "账单",  icon: "list",   iconFill: "list-fill"   },
  { id: "analysis", label: "分析",  icon: "chart",  iconFill: "chart-fill"  },
  { id: "budget",   label: "预算",  icon: "wallet", iconFill: "wallet-fill" },
]

function Spinner() {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--c-bg)",
    }}>
      <svg className="spinner" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="var(--c-fill)" strokeWidth="2.5"/>
        <path d="M12 3a9 9 0 019 9" stroke="var(--c-blue)" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

export default function App() {
  const { user, loading, logout } = useAuth()
  const [tab, setTab]             = useState("home")
  const [showAdd, setShowAdd]     = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    function onKey(e) {
      if (e.key !== "n" && e.key !== "N") return
      const tag = document.activeElement?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      setShowAdd(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (loading) return <Spinner />
  if (!user)   return <Login />

  function handleSaved() {
    setShowAdd(false)
    setTab("home")
    setRefreshKey(k => k + 1)
  }

  const btnBase = {
    background: "var(--c-fill)", border: "none", borderRadius: "8px",
    padding: "6px 12px", cursor: "pointer",
    fontSize: "13px", fontWeight: 500, color: "var(--c-text-2)",
    fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: "6px",
  }

  return (
    <>
      {/* ── Top Bar ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "56px",
        paddingTop: "env(safe-area-inset-top)",
        background: "var(--c-surface)",
        borderBottom: "0.5px solid var(--c-sep)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        {/* Left: Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="logo" />
          <span style={{ fontSize: "17px", fontWeight: 700, color: "var(--c-text-1)", letterSpacing: "-0.3px" }}>
            CoinSage
          </span>
          <button
            onClick={() => setShowSearch(true)}
            aria-label="搜索"
            style={{
              background: "var(--c-fill)", border: "none", borderRadius: "8px",
              padding: "6px 10px", cursor: "pointer",
              display: "flex", alignItems: "center",
              color: "var(--c-text-2)", marginLeft: "4px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {user.is_admin && (
            <>
              <button onClick={() => setShowAISettings(true)} style={btnBase} aria-label="AI 设置">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                AI 设置
              </button>
              <button onClick={() => setShowCategories(true)} style={btnBase} aria-label="管理分类">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                管理分类
              </button>
            </>
          )}
          <button
            onClick={logout}
            title={`退出登录（${user.username}）`}
            aria-label="退出登录"
            style={{ ...btnBase, padding: "6px 8px", color: "var(--c-text-3)" }}
          >
            <Icon name="logout" size={16} color="currentColor" />
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <main
        className="min-h-dvh"
        style={{
          background: "var(--c-bg)",
          paddingTop: "calc(env(safe-area-inset-top) + 56px)",
          paddingBottom: "calc(var(--tab-h) + env(safe-area-inset-bottom) + 8px)",
        }}
      >
        <div className="page-wrap">
          {tab === "home"     && <Home key={refreshKey} onAddClick={() => setShowAdd(true)} />}
          {tab === "history"  && <History />}
          {tab === "analysis" && <Analysis />}
          {tab === "budget"   && <Budget />}
        </div>
      </main>

      {/* ── Bottom Tab Bar ── */}
      <nav className="tab-bar">
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
      </nav>

      {/* ── FAB ── */}
      {tab === "home" && (
        <button
          onClick={() => setShowAdd(true)}
          aria-label="记一笔"
          style={{
            position: "fixed",
            bottom: "calc(var(--tab-h) + env(safe-area-inset-bottom) + 16px)",
            right: "20px",
            width: "52px", height: "52px", borderRadius: "50%",
            background: "var(--c-blue)", border: "none", cursor: "pointer",
            boxShadow: "var(--sh-btn)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.15s, box-shadow 0.15s",
            zIndex: 90,
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <Icon name="plus" size={22} color="white" />
        </button>
      )}

      {showAdd && <AddRecord onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {showCategories && <Categories onClose={() => setShowCategories(false)} />}
      {showAISettings && <AISettings onClose={() => setShowAISettings(false)} />}
      {showSearch && <Search onClose={() => setShowSearch(false)} />}
    </>
  )
}
