import { useEffect, useState } from "react"
import { api } from "../api"

const PROVIDERS = [
  { id: "openai",    label: "OpenAI / 兼容接口" },
  { id: "anthropic", label: "Anthropic Claude"  },
  { id: "ollama",    label: "Ollama（本地）"     },
]

const BASE_URL_HINTS = {
  openai: "不填=官方 OpenAI；Kimi: https://api.moonshot.cn/v1",
  anthropic: "无需填写，使用 Anthropic 官方接口",
  ollama: "默认 http://localhost:11434，可不填",
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

export default function AISettings({ onClose }) {
  const [form, setForm]       = useState({ provider: "openai", model: "", api_key: "", base_url: "", enabled: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    api.getAISettings()
      .then(s => setForm({
        provider: s.provider || "openai",
        model:    s.model    || "",
        api_key:  s.api_key  || "",
        base_url: s.base_url || "",
        enabled:  s.enabled  ?? false,
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    setSaving(true)
    try {
      await api.updateAISettings({
        provider: form.provider,
        model:    form.model.trim(),
        api_key:  form.api_key.trim(),
        base_url: form.base_url.trim() || null,
        enabled:  form.enabled,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* error handled by api.js */ }
    finally { setSaving(false) }
  }

  const inputStyle = {
    width: "100%", background: "transparent", border: "none",
    outline: "none", fontSize: "15px", color: "var(--c-text-1)",
    fontFamily: "var(--font)",
  }
  const labelStyle = {
    fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
    color: "var(--c-text-3)", textTransform: "uppercase",
    display: "block", marginBottom: "6px",
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "100%", maxHeight: "90dvh",
        background: "var(--c-surface)",
        borderRadius: "20px 20px 0 0",
        borderTop: "0.5px solid rgba(255,255,255,0.10)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "var(--c-sep)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 16px" }}>
          <button onClick={onClose} style={{ fontSize: "15px", fontWeight: 500, color: "var(--c-blue)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
            取消
          </button>
          <h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-text-1)", margin: 0 }}>AI 模型设置</h2>
          <button
            onClick={handleSave}
            disabled={saving || !form.model.trim()}
            style={{
              fontSize: "15px", fontWeight: 600, background: "none", border: "none",
              cursor: form.model.trim() ? "pointer" : "default", padding: "4px 0",
              color: saved ? "var(--c-green)" : form.model.trim() ? "var(--c-blue)" : "var(--c-text-3)",
              transition: "color 0.15s",
            }}
          >
            {saved ? "✓ 已保存" : saving ? "保存中…" : "保存"}
          </button>
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
                onClick={() => set("enabled", !form.enabled)}
                style={{
                  width: "50px", height: "28px", borderRadius: "14px", border: "none",
                  background: form.enabled ? "var(--c-blue)" : "var(--c-fill)",
                  cursor: "pointer", position: "relative", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: "3px",
                  left: form.enabled ? "25px" : "3px",
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  transition: "left 0.2s",
                }} />
              </button>
            </div>

            <div className="sep" style={{ marginBottom: "20px" }} />

            {/* Provider */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>服务商</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => set("provider", p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "12px 14px", borderRadius: "var(--r-md)",
                      border: `1.5px solid ${form.provider === p.id ? "var(--c-blue)" : "var(--c-sep)"}`,
                      background: form.provider === p.id ? "rgba(0,113,227,0.06)" : "var(--c-fill-2)",
                      cursor: "pointer", textAlign: "left", fontFamily: "var(--font)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: "16px", height: "16px", borderRadius: "50%",
                      border: `2px solid ${form.provider === p.id ? "var(--c-blue)" : "var(--c-text-3)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {form.provider === p.id && (
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--c-blue)" }} />
                      )}
                    </div>
                    <span style={{ fontSize: "14px", color: "var(--c-text-1)", fontWeight: 500 }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Model */}
            <div className="card" style={{ overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ padding: "14px 16px" }}>
                <label style={labelStyle}>模型名称</label>
                <input
                  style={inputStyle}
                  placeholder={
                    form.provider === "openai"    ? "gpt-4o-mini / moonshot-v1-8k / deepseek-chat" :
                    form.provider === "anthropic" ? "claude-haiku-4-5" :
                    "qwen2.5:7b"
                  }
                  value={form.model}
                  onChange={e => set("model", e.target.value)}
                />
              </div>

              {form.provider !== "anthropic" && (
                <>
                  <div className="sep" />
                  <div style={{ padding: "14px 16px" }}>
                    <label style={labelStyle}>
                      Base URL
                      <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: "6px" }}>
                        （可选）
                      </span>
                    </label>
                    <input
                      style={inputStyle}
                      placeholder={form.provider === "ollama" ? "http://localhost:11434" : "https://api.example.com/v1"}
                      value={form.base_url}
                      onChange={e => set("base_url", e.target.value)}
                    />
                    <p style={{ fontSize: "11px", color: "var(--c-text-3)", marginTop: "6px" }}>
                      {BASE_URL_HINTS[form.provider]}
                    </p>
                  </div>
                </>
              )}

              {form.provider !== "ollama" && (
                <>
                  <div className="sep" />
                  <div style={{ padding: "14px 16px" }}>
                    <label style={labelStyle}>API Key</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type={showKey ? "text" : "password"}
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="sk-..."
                        value={form.api_key}
                        onChange={e => set("api_key", e.target.value)}
                      />
                      <button
                        onClick={() => setShowKey(v => !v)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--c-text-3)", padding: "4px", flexShrink: 0,
                          display: "flex", alignItems: "center",
                        }}
                      >
                        <EyeIcon open={showKey} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Save button */}
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !form.model.trim()}
              style={{ marginTop: "8px" }}
            >
              {saved ? "✓ 设置已保存" : saving ? "保存中…" : "保存设置"}
            </button>

            <div style={{ height: "env(safe-area-inset-bottom, 20px)" }} />
          </div>
        )}
      </div>
    </div>
  )
}
