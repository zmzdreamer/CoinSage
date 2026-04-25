import { useEffect, useState } from "react"
import { api } from "../api"

const PROVIDERS = [
  { id: "openai",    label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "ollama",    label: "Ollama" },
]

const PROFILES_KEY  = "coinsage-ai-profiles"
const ACTIVE_ID_KEY = "coinsage-ai-active"
const EMPTY_DRAFT   = { provider: "openai", model: "", api_key: "", base_url: "" }

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]") }
  catch { return [] }
}

function saveProfiles(list) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list))
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  )
}

const BASE_URL_PLACEHOLDER = {
  openai:    "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  ollama:    "http://localhost:11434",
}

export default function AISettings({ onClose }) {
  const [profiles, setProfiles]     = useState([])
  const [activeId, setActiveId]     = useState(null)
  const [enabled, setEnabled]       = useState(false)
  const [draft, setDraft]           = useState(EMPTY_DRAFT)
  const [loading, setLoading]       = useState(true)
  const [activating, setActivating] = useState(null)
  const [adding, setAdding]         = useState(false)
  const [showKey, setShowKey]       = useState(false)

  useEffect(() => {
    const stored     = loadProfiles()
    const storedActId = localStorage.getItem(ACTIVE_ID_KEY)

    api.getAISettings()
      .then(s => {
        setEnabled(s.enabled ?? false)
        // 首次使用：把已有后端配置自动导入为第一条
        if (stored.length === 0 && s.model) {
          const id = Date.now().toString()
          const imported = [{ id, provider: s.provider || "openai", model: s.model, api_key: s.api_key || "", base_url: s.base_url || "" }]
          setProfiles(imported)
          saveProfiles(imported)
          setActiveId(id)
          localStorage.setItem(ACTIVE_ID_KEY, id)
        } else {
          setProfiles(stored)
          if (storedActId && stored.find(p => p.id === storedActId)) setActiveId(storedActId)
        }
      })
      .catch(() => {
        setProfiles(stored)
        if (storedActId && stored.find(p => p.id === storedActId)) setActiveId(storedActId)
      })
      .finally(() => setLoading(false))
  }, [])

  function switchProvider(provider) {
    setDraft({ ...EMPTY_DRAFT, provider })
    setShowKey(false)
  }

  async function handleActivate(profile) {
    setActivating(profile.id)
    try {
      await api.updateAISettings({ provider: profile.provider, model: profile.model, api_key: profile.api_key, base_url: profile.base_url || null, enabled })
      setActiveId(profile.id)
      localStorage.setItem(ACTIVE_ID_KEY, profile.id)
    } catch {}
    finally { setActivating(null) }
  }

  async function handleToggleEnabled() {
    const next = !enabled
    setEnabled(next)
    const active = profiles.find(p => p.id === activeId)
    if (active) {
      try { await api.updateAISettings({ provider: active.provider, model: active.model, api_key: active.api_key, base_url: active.base_url || null, enabled: next }) }
      catch {}
    }
  }

  async function handleAdd() {
    if (!draft.model.trim()) return
    setAdding(true)
    const id = Date.now().toString()
    const profile = { id, provider: draft.provider, model: draft.model.trim(), api_key: draft.api_key.trim(), base_url: draft.base_url.trim() }
    try {
      await api.updateAISettings({ provider: profile.provider, model: profile.model, api_key: profile.api_key, base_url: profile.base_url || null, enabled })
      const updated = [...profiles, profile]
      setProfiles(updated)
      saveProfiles(updated)
      setActiveId(id)
      localStorage.setItem(ACTIVE_ID_KEY, id)
      setDraft(EMPTY_DRAFT)
      setShowKey(false)
    } catch {}
    finally { setAdding(false) }
  }

  function handleDelete(id) {
    const updated = profiles.filter(p => p.id !== id)
    setProfiles(updated)
    saveProfiles(updated)
    if (activeId === id) {
      setActiveId(null)
      localStorage.removeItem(ACTIVE_ID_KEY)
    }
  }

  const inputStyle = { width: "100%", background: "transparent", border: "none", outline: "none", fontSize: "15px", color: "var(--c-text-1)", fontFamily: "var(--font)" }
  const labelStyle = { fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--c-text-3)", textTransform: "uppercase", display: "block", marginBottom: "6px" }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxHeight: "90dvh", background: "var(--c-surface)", borderRadius: "20px 20px 0 0", borderTop: "0.5px solid rgba(255,255,255,0.10)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--c-sep)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 16px" }}>
          <button onClick={onClose} style={{ fontSize: "15px", fontWeight: 500, color: "var(--c-blue)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>关闭</button>
          <h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-text-1)", margin: 0 }}>AI 模型设置</h2>
          <div style={{ width: "40px" }} />
        </div>

        <div className="sep" />

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--c-text-3)" }}>加载中…</div>
        ) : (
          <div style={{ overflowY: "auto", padding: "20px" }}>

            {/* 启用开关 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--c-text-1)", margin: 0 }}>启用 AI 功能</p>
                <p style={{ fontSize: "12px", color: "var(--c-text-3)", marginTop: "2px" }}>关闭后分析页不调用模型</p>
              </div>
              <button
                onClick={handleToggleEnabled}
                style={{ width: "50px", height: "28px", borderRadius: "14px", border: "none", background: enabled ? "var(--c-blue)" : "var(--c-fill)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
              >
                <div style={{ position: "absolute", top: "3px", left: enabled ? "25px" : "3px", width: "22px", height: "22px", borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
              </button>
            </div>

            <div className="sep" style={{ marginBottom: "20px" }} />

            {/* 已保存列表 */}
            {profiles.length > 0 && (
              <>
                <label style={labelStyle}>已保存的模型</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                  {profiles.map(p => {
                    const isActive = p.id === activeId
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "var(--r-md)", border: `1.5px solid ${isActive ? "var(--c-blue)" : "var(--c-sep)"}`, background: isActive ? "rgba(0,113,227,0.06)" : "var(--c-fill-2)" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "6px", background: isActive ? "var(--c-blue)" : "var(--c-fill)", color: isActive ? "white" : "var(--c-text-2)", flexShrink: 0 }}>
                          {PROVIDERS.find(v => v.id === p.provider)?.label ?? p.provider}
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--c-text-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.model}
                        </span>
                        {isActive ? (
                          <span style={{ fontSize: "12px", color: "var(--c-blue)", fontWeight: 600, flexShrink: 0 }}>使用中</span>
                        ) : (
                          <button onClick={() => handleActivate(p)} disabled={!!activating} style={{ fontSize: "13px", fontWeight: 500, color: "var(--c-blue)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontFamily: "var(--font)" }}>
                            {activating === p.id ? "切换…" : "使用"}
                          </button>
                        )}
                        <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-3)", padding: "2px", flexShrink: 0, display: "flex", alignItems: "center" }}>
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="sep" style={{ marginBottom: "20px" }} />
              </>
            )}

            {/* 添加新模型 */}
            <label style={labelStyle}>添加模型</label>

            {/* 服务商选择 */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {PROVIDERS.map(pv => (
                <button
                  key={pv.id}
                  onClick={() => switchProvider(pv.id)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: "var(--r-md)", border: `1.5px solid ${draft.provider === pv.id ? "var(--c-blue)" : "var(--c-sep)"}`, background: draft.provider === pv.id ? "rgba(0,113,227,0.06)" : "var(--c-fill-2)", cursor: "pointer", fontFamily: "var(--font)", fontSize: "12px", fontWeight: 500, color: draft.provider === pv.id ? "var(--c-blue)" : "var(--c-text-2)", transition: "all 0.15s" }}
                >
                  {pv.label}
                </button>
              ))}
            </div>

            {/* 表单字段 */}
            <div className="card" style={{ overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ padding: "14px 16px" }}>
                <label style={labelStyle}>模型名称</label>
                <input
                  style={inputStyle}
                  placeholder={
                    draft.provider === "openai"    ? "gpt-5.5" :
                    draft.provider === "anthropic" ? "claude-opus-4-7 / claude-sonnet-4-6" :
                    "qwen3.5-4b"
                  }
                  value={draft.model}
                  onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
                />
              </div>

              <div className="sep" />
              <div style={{ padding: "14px 16px" }}>
                <label style={labelStyle}>Base URL <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>（可选）</span></label>
                <input
                  style={inputStyle}
                  placeholder={BASE_URL_PLACEHOLDER[draft.provider]}
                  value={draft.base_url}
                  onChange={e => setDraft(d => ({ ...d, base_url: e.target.value }))}
                />
              </div>

              {draft.provider !== "ollama" && (
                <>
                  <div className="sep" />
                  <div style={{ padding: "14px 16px" }}>
                    <label style={labelStyle}>API Key</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type={showKey ? "text" : "password"}
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="sk-..."
                        value={draft.api_key}
                        onChange={e => setDraft(d => ({ ...d, api_key: e.target.value }))}
                      />
                      <button onClick={() => setShowKey(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-3)", padding: "4px", flexShrink: 0, display: "flex", alignItems: "center" }}>
                        <EyeIcon open={showKey} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button className="btn-primary" onClick={handleAdd} disabled={adding || !draft.model.trim()} style={{ marginTop: "4px" }}>
              {adding ? "添加中…" : "添加并使用"}
            </button>

            <div style={{ height: "env(safe-area-inset-bottom, 20px)" }} />
          </div>
        )}
      </div>
    </div>
  )
}
