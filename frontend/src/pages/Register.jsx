import { useState } from "react"
import { useAuth } from "../AuthContext"
import { api } from "../api"

export default function Register({ isFirstRun = false, onSwitchToLogin }) {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm]   = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password || !confirm) return
    if (password !== confirm) { setError("两次密码不一致"); return }
    if (password.length < 6)  { setError("密码至少 6 位"); return }
    setLoading(true); setError("")
    try {
      const resp = await api.register(username.trim(), password)
      login(resp)
    } catch (err) {
      const msg = err?.message || ""
      if (msg.includes("409")) setError("用户名已被占用")
      else if (msg.includes("403")) setError("注册已关闭")
      else setError("注册失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: "100%", background: "transparent", border: "none",
    outline: "none", fontSize: "16px", color: "var(--c-text-1)",
    fontFamily: "var(--font)",
  }
  const labelStyle = {
    display: "block", fontSize: "11px", fontWeight: 600,
    letterSpacing: "0.08em", color: "var(--c-text-3)",
    textTransform: "uppercase", marginBottom: "6px",
  }

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--c-bg)", padding: "24px",
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
            {isFirstRun ? "创建第一个账号" : "创建账号"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ overflow: "hidden", marginBottom: "12px" }}>
            {/* Username */}
            <div style={{ padding: "14px 16px" }}>
              <label style={labelStyle}>用户名</label>
              <input type="text" autoComplete="username" autoFocus
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名" style={inputStyle} />
            </div>
            <div className="sep" />
            {/* Password */}
            <div style={{ padding: "14px 16px" }}>
              <label style={labelStyle}>密码</label>
              <input type="password" autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="至少 6 位" style={inputStyle} />
            </div>
            <div className="sep" />
            {/* Confirm Password */}
            <div style={{ padding: "14px 16px" }}>
              <label style={labelStyle}>确认密码</label>
              <input type="password" autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="再次输入密码" style={inputStyle} />
            </div>
          </div>

          {error && (
            <p style={{ fontSize: "13px", color: "var(--c-red)",
              textAlign: "center", marginBottom: "12px" }}>{error}</p>
          )}

          <button type="submit" className="btn-primary"
            disabled={loading || !username.trim() || !password || !confirm}>
            {loading ? "注册中…" : "注册"}
          </button>
        </form>

        {!isFirstRun && onSwitchToLogin && (
          <p style={{ textAlign: "center", marginTop: "20px",
            fontSize: "14px", color: "var(--c-text-3)" }}>
            已有账号？{" "}
            <button onClick={onSwitchToLogin}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "var(--c-blue)", fontFamily: "var(--font)", fontSize: "14px" }}>
              登录
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
