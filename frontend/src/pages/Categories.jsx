import { useState, useEffect, useRef } from "react"
import { categoryApi } from "../categoryApi"
import { useToast } from "../ToastContext"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#6b7280", "#78716c", "#0ea5e9",
]

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", padding: "4px 0" }}>
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: c,
            border: value === c ? "2.5px solid var(--c-text-1)" : "2px solid transparent",
            cursor: "pointer", transition: "transform 0.1s",
            transform: value === c ? "scale(1.15)" : "scale(1)",
          }}
        />
      ))}
    </div>
  )
}

export default function Categories({ onClose }) {
  const showToast = useToast()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)

  // 新增表单
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState("")
  const [addColor, setAddColor] = useState("#3b82f6")
  const [addLoading, setAddLoading] = useState(false)

  // 编辑状态：editId → 正在编辑的分类 id
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  // 删除二次确认：deleteConfirm → id
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const deleteTimer = useRef(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await categoryApi.list()
      setCats(data)
    } finally {
      setLoading(false)
    }
  }

  // ── 新增 ──
  async function handleAdd() {
    if (!addName.trim()) return
    setAddLoading(true)
    try {
      await categoryApi.create({ name: addName.trim(), color: addColor, icon: "tag" })
      setAddName("")
      setAddColor("#3b82f6")
      setShowAdd(false)
      await load()
      showToast("分类已添加")
    } finally {
      setAddLoading(false)
    }
  }

  // ── 编辑 ──
  function startEdit(cat) {
    setEditId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color || "#6b7280")
  }

  function cancelEdit() {
    setEditId(null)
  }

  async function handleSave(id) {
    setEditLoading(true)
    try {
      await categoryApi.update(id, { name: editName.trim(), color: editColor })
      setEditId(null)
      await load()
      showToast("分类已更新")
    } finally {
      setEditLoading(false)
    }
  }

  // ── 删除二次确认 ──
  function handleDeleteClick(id) {
    if (deleteConfirm === id) {
      // 第二次点击 → 真正删除
      clearTimeout(deleteTimer.current)
      setDeleteConfirm(null)
      doDelete(id)
    } else {
      // 第一次点击 → 进入确认状态，3秒后复原
      if (deleteTimer.current) clearTimeout(deleteTimer.current)
      setDeleteConfirm(id)
      deleteTimer.current = setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  async function doDelete(id) {
    try {
      await categoryApi.delete(id)
      await load()
      showToast("分类已删除")
    } catch {
      showToast("删除失败", "error")
    }
  }

  // 点击背景关闭
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div style={{
        width: "100%", maxHeight: "85vh",
        background: "var(--c-surface)",
        borderRadius: "20px 20px 0 0",
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* 顶部 handle + 标题栏 */}
        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <div style={{
            width: "36px", height: "4px", borderRadius: "2px",
            background: "var(--c-sep)", margin: "0 auto 16px",
          }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "17px", fontWeight: 600, color: "var(--c-text-1)" }}>管理分类</span>
            <button
              onClick={onClose}
              style={{
                background: "var(--c-fill)", border: "none", borderRadius: "50%",
                width: "28px", height: "28px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--c-text-2)", fontSize: "16px", fontWeight: 500,
              }}
            >×</button>
          </div>
        </div>

        {/* 分类列表 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px", color: "var(--c-text-3)", fontSize: "14px" }}>加载中…</div>
          ) : (
            cats.map((cat, i) => {
              const isEdit = editId === cat.id
              const isPendingDelete = deleteConfirm === cat.id
              const isDefault = cat.id <= 6

              return (
                <div key={cat.id}>
                  {i > 0 && <div className="sep" />}
                  {isEdit ? (
                    // 编辑模式
                    <div style={{ padding: "12px 0" }}>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          padding: "8px 12px", borderRadius: "10px",
                          border: "1.5px solid var(--c-blue)",
                          background: "var(--c-fill)", color: "var(--c-text-1)",
                          fontSize: "15px", fontFamily: "var(--font)",
                          marginBottom: "10px", outline: "none",
                        }}
                      />
                      <ColorPicker value={editColor} onChange={setEditColor} />
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <button
                          onClick={() => handleSave(cat.id)}
                          disabled={editLoading || !editName.trim()}
                          className="btn-primary"
                          style={{ flex: 1, padding: "8px", fontSize: "14px" }}
                        >保存</button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            flex: 1, padding: "8px", fontSize: "14px",
                            background: "var(--c-fill-2)", border: "none",
                            borderRadius: "10px", cursor: "pointer",
                            color: "var(--c-text-2)", fontFamily: "var(--font)",
                          }}
                        >取消</button>
                      </div>
                    </div>
                  ) : (
                    // 普通显示行
                    <div style={{
                      display: "flex", alignItems: "center",
                      padding: "13px 0", gap: "12px",
                    }}>
                      <div style={{
                        width: "12px", height: "12px", borderRadius: "50%",
                        background: cat.color || "#6b7280", flexShrink: 0,
                      }} />
                      <span style={{ flex: 1, fontSize: "15px", color: "var(--c-text-1)" }}>{cat.name}</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {/* 编辑按钮 */}
                        <button
                          onClick={() => startEdit(cat)}
                          style={{
                            background: "var(--c-fill)", border: "none", borderRadius: "8px",
                            padding: "5px 10px", cursor: "pointer",
                            fontSize: "12px", color: "var(--c-text-2)",
                            fontFamily: "var(--font)",
                          }}
                        >编辑</button>
                        {/* 删除按钮：仅非默认分类显示 */}
                        {!isDefault && (
                          <button
                            onClick={() => handleDeleteClick(cat.id)}
                            style={{
                              background: isPendingDelete ? "var(--c-red)" : "var(--c-fill)",
                              border: "none", borderRadius: "8px",
                              padding: "5px 10px", cursor: "pointer",
                              fontSize: "12px",
                              color: isPendingDelete ? "white" : "var(--c-text-2)",
                              fontFamily: "var(--font)",
                              transition: "background 0.2s, color 0.2s",
                              whiteSpace: "nowrap",
                            }}
                          >{isPendingDelete ? "再点确认" : "删除"}</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 底部添加区域 */}
        <div style={{
          flexShrink: 0, padding: "12px 20px",
          borderTop: "0.5px solid var(--c-sep)",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}>
          {showAdd ? (
            <div>
              <input
                autoFocus
                placeholder="分类名称"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 14px", borderRadius: "12px",
                  border: "1.5px solid var(--c-blue)",
                  background: "var(--c-fill)", color: "var(--c-text-1)",
                  fontSize: "15px", fontFamily: "var(--font)",
                  marginBottom: "10px", outline: "none",
                }}
              />
              <ColorPicker value={addColor} onChange={setAddColor} />
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  onClick={handleAdd}
                  disabled={addLoading || !addName.trim()}
                  className="btn-primary"
                  style={{ flex: 1, padding: "10px", fontSize: "15px" }}
                >{addLoading ? "添加中…" : "确认"}</button>
                <button
                  onClick={() => { setShowAdd(false); setAddName(""); setAddColor("#3b82f6") }}
                  style={{
                    flex: 1, padding: "10px", fontSize: "15px",
                    background: "var(--c-fill-2)", border: "none",
                    borderRadius: "12px", cursor: "pointer",
                    color: "var(--c-text-2)", fontFamily: "var(--font)",
                  }}
                >取消</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                width: "100%", padding: "12px",
                background: "var(--c-fill)", border: "1.5px dashed var(--c-sep)",
                borderRadius: "12px", cursor: "pointer",
                fontSize: "15px", color: "var(--c-text-2)",
                fontFamily: "var(--font)", fontWeight: 500,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
              添加分类
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
