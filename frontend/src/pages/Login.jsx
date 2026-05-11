import { useState } from "react"
import { useAuth } from "../AuthContext"
import { api } from "../api"

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError("")
    try {
      const resp = await api.login(username.trim(), password)
      login(resp)
    } catch {
      setError("用户名或密码错误")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--c-bg)",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "16px",
            background: "#0071E3",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: "16px",
          }}>
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
              <path d="M8 20l4-12 4 12M9.5 16h5" stroke="white" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px",
            color: "var(--c-text-1)", margin: 0,
          }}>CoinSage</h1>
          <p style={{ fontSize: "14px", color: "var(--c-text-3)", marginTop: "6px" }}>
            记录每一笔，掌握每一分
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ overflow: "hidden", marginBottom: "12px" }}>
            {/* Username */}
            <div style={{ padding: "14px 16px" }}>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 600,
                letterSpacing: "0.08em", color: "var(--c-text-3)",
                textTransform: "uppercase", marginBottom: "6px",
              }}>用户名</label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名"
                style={{
                  width: "100%", background: "transparent", border: "none",
                  outline: "none", fontSize: "16px", color: "var(--c-text-1)",
                  fontFamily: "var(--font)",
                }}
              />
            </div>
            <div className="sep" />
            {/* Password */}
            <div style={{ padding: "14px 16px" }}>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 600,
                letterSpacing: "0.08em", color: "var(--c-text-3)",
                textTransform: "uppercase", marginBottom: "6px",
              }}>密码</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                style={{
                  width: "100%", background: "transparent", border: "none",
                  outline: "none", fontSize: "16px", color: "var(--c-text-1)",
                  fontFamily: "var(--font)",
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontSize: "13px", color: "var(--c-red)", textAlign: "center",
              marginBottom: "12px",
            }}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                  <path d="M12 3a9 9 0 019 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                登录中…
              </>
            ) : "登录"}
          </button>
        </form>

        {onSwitchToRegister && (
          <p style={{ textAlign: "center", marginTop: "20px",
            fontSize: "14px", color: "var(--c-text-3)" }}>
            还没有账号？{" "}
            <button onClick={onSwitchToRegister}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "var(--c-blue)", fontFamily: "var(--font)", fontSize: "14px" }}>
              注册
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
